# To make it work with pycharm IDE do the following 2 steps:
# 2. Create a new configuration and use that one (Run, Edit Configuration, New Configuration
# 3. Add SPARK_HOME to your spark folder (where bin, conf, jars etc folders are located).
# 4. Add PYTHONPATH as $SPARK_HOME$/python/
# 5. Unzip the py4j-0.10.3-src.zip content to $SPARK_HOME$/python/py4j (at least on windows)
#http://stackoverflow.com/questions/34685905/how-to-link-pycharm-with-pyspark
import argparse
import sys
import os
import subprocess
import struct
import hashlib
from collections import namedtuple
from parse import *
from pyspark import SparkConf, SparkContext
import json
import pika
import pymongo
from gridfs import GridFS
import traceback
import threading
import queue
import shutil

logsFullPath =""

# Creates the spark context
def createSparkContext(Params):
    conf = (SparkConf().setMaster(Params.parameterMaster)
                        .setAppName(Params.parameterAppName)
                        .set("spark.executor.memory", Params.parameterMemory)
                        .set("spark.executor.instances", 10))

    sc = SparkContext(conf=conf)

    # Add modules needed to be exported (copied) to all workers
    currentDirPath = os.path.dirname(os.path.abspath(__file__)) + "/"
    modulesToImport = ['functors.py', 'worker.py', 'population.py']

    for module in modulesToImport:
        sc.addPyFile(currentDirPath + module)

    sc.addPyFile(Params.simpleTracerPath)

    return sc

def readParams():
    parser = argparse.ArgumentParser()
    parser.add_argument("--testsFolderCount", help="A number how many new folders with tests to generate",type=int)
    parser.add_argument("--numTasks", help="Num tasks to be created. THese will compete on your N workers. Unfortunatelly Python doesn't have something implemented as Scala to find out the number of workers in the system.", type=int)
    parser.add_argument("--testProgramName", help="The program used to evaluate the new generated tests. This must exist in env var LD_LIBRARY_PATH folder")
    parser.add_argument("--simpleTracerPath", help="The path to the full path of simple tracer executable. If nothing here, take it by default from SIMPLETRACERPATH")
    parser.add_argument("--isDebugEnabled", help="Display output from genetic generations", type=int)
    parser.add_argument("--isParallelExecution", help="Is Parallel execution ? ", type=int)

    parser.add_argument("--elitismPercent", help="How many to store from the best individuals from the previous generation", type=float)
    parser.add_argument("--populationSize", help="How many individuals per task", type=int)
    parser.add_argument("--inputLength", help="Length of each test (individual)", type=int)
    parser.add_argument("--numberOfIterations", help="Number of generations per task. A task will try to optimize its population this number of times", type=int)
    parser.add_argument("--oldGenerationP", help="Probability of selecting normal individuals (not elite ones) from the old generation - creates some diversity", type=float)
    parser.add_argument("--mutationP", help="Mutation probability", type=float)
    parser.add_argument("--deltaMutate", help="How much to increase mutation probability when local maxima is detected", type=float)
    parser.add_argument("--thresholdForLocalMaxima", help="Tthreshold to consider local maxima stuck and apply the delta mutate", type=float)

    parser.add_argument("--master", help="master of execution. By default is 'local' machine")
    parser.add_argument("--executorMemory", help="num gigabytes of ram memory that you allow spark to use on executor machines. by default we are using 1 gigabyte", type=int)
    parser.add_argument("--appName", help="name of the application - used for tracking purposes. by default is 'myapp'")
    parser.add_argument("--config", help="config file with mongo and rabbitmq info")
    parser.add_argument("--driver", help="use driver database for input, not hardcoded data", type=int)
    parser.add_argument("--executableId", help="executable id retrieved from web interface")
    args = parser.parse_args()

    Params = ParamsType
    Params.parameterMaster 			= "local" if args.master is None else str(args.master)
    Params.parameterMemory 			= "1g" if args.master is None else (str(args.executorMemory) + "g")
    Params.parameterAppName 		= "MyApp" if args.appName is None else str(args.appName)

    # First folder comes from somewhere ...fuzzy probably
    Params.testsFolderCount        = 1 if args.testsFolderCount is None else args.testsFolderCount
    Params.numTasks                = 1 if args.numTasks is None else args.numTasks

    simpleTracerPath = None
    if args.simpleTracerPath is None:
        #if psimple tracer path is not overridden, take it from the environment variable
        try:
            simpleTracerPath = os.environ["SIMPLETRACERPATH"]
        except KeyError:
            print ("ERROR: Please set the environment variable SIMPLETRACERPATH")
            sys.exit(1)

    if not os.path.exists(simpleTracerPath):
        print("ERROR: Simple tracer was not found at " + simpleTracerPath)
        sys.exit(1)

    Params.simpleTracerPath = simpleTracerPath

    # HACK : parameter shouldn't be optional
    if args.testProgramName is None:
        Params.testProgramName          = "libhttp-parser.so"
    else:
        Params.testProgramName          = args.testProgramName

    # Check if it's there
    if not os.environ["LD_LIBRARY_PATH"]:
        print("ERROR: Please set the environment variable LD_LIBRARY_PATH. It should contain inside this folder the binaries used for testing (testProgramName parameter)")
        sys.exit(1)

    ldPaths = os.environ["LD_LIBRARY_PATH"].split(":")

    fullTestProgramPath = ""
    for path in ldPaths:
        fullTestProgramPath = os.path.join(path, Params.testProgramName)
        if not os.path.exists(fullTestProgramPath):
            print("WARN: Skipping ld path " + path)
            continue

    if not fullTestProgramPath:
        print("ERROR: Program to test was not found at " + fullTestProgramPath)
        sys.exit(1)

    Params.DEBUG_ENABLED            = False if args.isDebugEnabled is None else args.isDebugEnabled
    Params.isParallelExecution      = False if args.isParallelExecution is None else args.isParallelExecution

    Params.elitismPercent 			= 0.2 if args.elitismPercent is None else args.elitismPercent
    Params.populationSize 			= 2  if args.populationSize is None else args.populationSize
    Params.inputLength    			= 20  if args.inputLength is None else args.inputLength
    Params.numberOfIterations 		= 1  if args.numberOfIterations is None else args.numberOfIterations
    Params.oldGenerationP			= 0.1 if args.oldGenerationP is None else args.oldGenerationP
    Params.mutationP				= 0.2 if args.mutationP is None else args.mutationP
    Params.deltaMutate				= 0.3 if args.deltaMutate is None else args.deltaMutate
    Params.thresholdForLocalMaxima  = 0.000001 if args.thresholdForLocalMaxima is None else args.thresholdForLocalMaxima
    Params.config                   = os.path.join(os.getcwd(), "config.json") if args.config is None else args.config
    Params.driver                   = False if args.driver is None else args.driver
    Params.executableId             = args.executableId

    #  Set template for a input entry
    entryType_TestName              = 0x0010
    entryType_Module                = 0x00B0
    entryType_Offset                = 0x00BB
    entryType_InputUsage            = 0x00AA
    EntryTemplate                   = namedtuple("t", "hF hS oF oS TN TM TO TIU") # header format, header size, offset format, offset size
    headerFtm                       = 'h h'
    offsetFtm                       = 'I h h h'
    Params.entryTemplate            = EntryTemplate(hF = headerFtm, hS = struct.calcsize(headerFtm), oF = offsetFtm, oS = struct.calcsize(offsetFtm),
                                                    TN = entryType_TestName, TM = entryType_Module, TO = entryType_Offset, TIU = entryType_InputUsage)

    if Params.populationSize < 2:
        print("EROR: Please set a valid population size >=2" )
        sys.exit(1)

    if not os.path.isfile(Params.config):
        print("ERROR: config file not found %s" % Params.config)
        sys.exit(1)

    if Params.driver:
        if Params.executableId is None:
            print("ERROR: Specify executable id for **driver** option")
            sys.exit(1)
        else:
            print("INFO: id[ %s ] Using DRIVER database for testcase input." % Params.executableId)


    global logsFullPath
    try:
        logsFullPath = os.environ["SIMPLETRACERLOGSPATH"]
    except KeyError:
        print("ERROR: Please set the environment variable SIMPLETRACERLOGSPATH")
        sys.exit(1)

    return Params

def clearLogsDirectory():
    if os.path.isdir(logsFullPath):
        shutil.rmtree(logsFullPath)
    os.mkdir(logsFullPath)

def getFolderPathFromId(ithFolder):
    return logsFullPath + "/generation" + str(ithFolder)

def getResultsPath():
    return os.path.join(logsFullPath, "results")

def getBlockOffsetEntryFromLine(line):
    if len(line.split()) != 5:
        return None,None # assert ?
    wordsOnLine = parse("{module} + {offset:x} ({cost:^d})", line)

    modulePath = wordsOnLine["module"]
    moduleName = modulePath[modulePath.rfind('/')+1 : ]; # using only the name for name as an optimization for string searches. Could make a map between full and name in the end if someone needs the full path
    return moduleName, int(wordsOnLine["offset"], 10)

def sha1Sum(contentBuffer):
    m = hashlib.sha1()
    m.update(contentBuffer)
    return m.hexdigest()

def ordArrayToByteStream(content):
    return b''.join(bytes([c]) for c in content)

def byteStreamToOrdArray(content):
    return [x for x in content]

def writeTestcaseToDisk(content, targetDir):
    if not os.path.isdir(targetDir):
        os.mkdir(targetDir)

    testcase = ordArrayToByteStream(content)
    hashname = sha1Sum(testcase)
    fd = open(os.path.join(targetDir, hashname), 'wb')
    fd.write(testcase)
    fd.close()

def writeTestcaseToProcess(length, contentBuffer, process, doFlush=True):
    hashname = sha1Sum(contentBuffer)

    payload = bytearray(hashname, 'utf8') + b"\x00" * (60 - len(hashname))
    payload += struct.pack("<I", length)
    payload += contentBuffer

    process.stdin.write(payload)
    process.stdin.flush()

def createTracerCmd(Params):
    return [Params.simpleTracerPath, "--payload", Params.testProgramName, \
            "--outfile", "stdout", "--batch", "--binlog", "--binbuffered", \
            "--disableLogs"]

def stopTracerProcess(process):
    process.kill()

def createTracerProcess(cmd, payloadSize):
    # fully buffered, PIPE read/write
    p = subprocess.Popen(cmd, bufsize=-1, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
    if p == None:
        print("ERROR: Cannot create tracer process with command:\n%s" % cmd)
        exit(1)
    return p

def getNextEntryFromStream(dataStream, streamPos, entryTemplate):
    headerFtm = entryTemplate.hF
    headerSize = entryTemplate.hS
    offsetInfoFmt = entryTemplate.oF
    offsetInfoSize = entryTemplate.oS
    ## sizeof(I h h h) is 10 but it is aligned to 4bytes

    headerRes = struct.unpack_from(headerFtm, dataStream, streamPos)
    streamPos += headerSize

    type = headerRes[0]
    length = headerRes[1]

    nameString = ''
    offset = 0
    cost = 0
    jumpType = 0
    jumpInstruction = 0

    if type == entryTemplate.TN or type == entryTemplate.TM: # test name or module name type
        # do something
        nameString = dataStream[streamPos: streamPos + length]

        entrySize = headerSize + length
        streamPos += length
    elif type == entryTemplate.TO: # pffset type
        offsetInfoRes   = struct.unpack_from(offsetInfoFmt, dataStream, streamPos)
        offset          = offsetInfoRes[0]
        cost            = offsetInfoRes[1]
        jumpType        = offsetInfoRes[2]
        jumpInstruction = offsetInfoRes[3]

        entrySize = headerSize + length
        streamPos += length ## offsetInfoSize == 10 != 12 (alignment issue)
    elif type == entryTemplate.TIU:
        print("Input usage: Not supported")
        exit(1)
    else:
        assert 1 == 0 # Unknown type !!!


    return (type, length, nameString, offset, cost, jumpType, jumpInstruction, entrySize)


class ParamsType:
    pass

class ConfigHandler:

    def __init__(self, configPath):
        self.configPath = configPath
        self.parseConfig()

    def parseConfig(self):
        try:
            configData = open(self.configPath).read()
            assert(len(configData) > 0)
            data = json.loads(configData)
            self.config = data
        except (OSError, IOError) as e:
            print("ERROR: cannot parse config file. %s" % self.configPath)
            traceback.print_exc()
            sys.exit(1)

    def getRabbit(self):
        return self.config['rabbit']

    def getRabbitFlow(self):
        return self.getRabbit()['flow']

    def getRabbitNewQueuePrefix(self):
        flow = self.getRabbitFlow()
        return flow['prefix'] + '.' +  flow['new'] + '.'

    def getRabbitTracedQueuePrefix(self):
        flow = self.getRabbitFlow()
        return flow['prefix'] + '.' +  flow['traced'] + '.'

    def getRabbitConn(self):
        return (self.getRabbit()['host'], self.getRabbit()['port'])

    def getRabbitCredentials(self):
        return (self.getRabbit()['user'], self.getRabbit()['password'])

    def getMongo(self):
        return self.config['mongo']

    def getMongoConn(self):
        return (self.getMongo()['host'], self.getMongo()['port'])

    def getMongoDbName(self):
        return self.getMongo()['database']

    def getMongoPrefix(self):
        return self.getMongo()['prefix']

    def getMongoFSPrefix(self):
        return self.getMongo()['prefixfs']

    def getMongoUser(self):
        return self.getMongo()['user']

    def getMongoPassword(self):
        return self.getMongo()['password']

    def getMongoUri(self, protocol):
        res = protocol + '://'
        res += self.getMongoUser()
        res += ':'
        res += self.getMongoPassword()
        res += '@'
        conn = self.getMongoConn()
        res += conn[0] + ':' + str(conn[1])
        res += '/'

        return res


class MongoHandler:

    def __init__(self, executableId, configHandler):
        self.executableId = executableId
        self.configHandler = configHandler
        self.connected = False

    def isConnected(self):
        return self.connected

    def mongoConnect(self):
        try:
            self.mongoclient = pymongo.MongoClient(self.configHandler.getMongoUri("mongodb"))
            self.dbname = self.configHandler.getMongoDbName()
            self.db = self.mongoclient[self.dbname]

            self.collname = self.configHandler.getMongoPrefix() + self.executableId
            self.collection = self.db[self.collname]

            self.fscollname = self.configHandler.getMongoFSPrefix() + self.executableId;
            self.gfs = GridFS(self.db, collection=self.fscollname)

            self.connected = True

        except Exception as e:
            print("ERROR: Cannot connect to mongo %s:%d" % self.configHandler.getMongoConn())
            traceback.print_exc()
            sys.exit(1)

    def fileExists(self, filename):
        doc = self.gfs.exists({"filename" : filename})
        return doc is not None

    def readFile(self, filename) :
        f = self.gfs.find_one({"filename" : filename})
        if not f:
            print("WARN: Cannot find file: %s in gridfs of binary %s" % (filename, self.executableId))
            return None

        return f.read()

    def findOne(self, id):
        doc = self.collection.find_one({"_id" : id, "state" : "traced"})
        if not doc:
            print("ERROR: Could not find doc for id: %s" % id)
            return (None, None)
        if not self.fileExists(id):
            print("ERROR: File: %s not present in gridfs of binary: %s" % (filename, self.executableId))
            sys.exit(1)

        trace = self.readFile(id)
        if not trace:
            print("WARN: Trace retrieval failed for id %s" % id)
            trace = None

        return (doc['data'], trace)

    def insert(self, contentBuffer):
        byteStream = ordArrayToByteStream(contentBuffer)
        id = sha1Sum(byteStream)
        post = {"_id" : id,
                "data" : byteStream,
                "state" : "new",
                "interesting" : True}
        try:
            self.collection.insert(post)
            print("INFO: New testcase inserted with id %s" % id)
            return True
        except pymongo.errors.DuplicateKeyError as e:
            print("WARN: Duplicate id %s\n" % id)
            return False

class TraceImporter:

    def __init__(self, executableId,
            configHandler=None,
            mongoHandler=None,
            driverPresent=False):
        self.driverPresent = driverPresent
        self.executableId = executableId
        self.configHandler = configHandler
        self.mongoHandler = mongoHandler
        self.addedTestcases = 0
        self.consumedTestcases = 0

        if driverPresent:
            self.queueName = self.configHandler.getRabbitTracedQueuePrefix() + \
                    self.executableId

            self.queue = queue.Queue()
            if not self.mongoHandler.isConnected():
                self.mongoHandler.mongoConnect()
            self.rabbitConnect()

    def killThread(self):
        self.channel.stop_consuming()

    def clear(self):
        if not self.driverPresent:
            return

        try:
            print("INFO: Closing RabbitMQ connection to %s:%s" % (
                self.host, self.port))
            self.connection.add_timeout(0, self.killThread)
            self.connection.close()
            self.lthread.join()
        except Exception as e:
            traceback.print_exc()
            sys.exit(1)

    def rabbitConsumeCallback(self, channel, method, properties, body):
        #print("INFO: Queue consume callback")
        self.queue.put((method, body))

    def rabbitListen(self):
        print("INFO: Started listening for incoming messages.")
        try:
            self.channel.start_consuming()
        except Exception as e:
            print("WARN: Rabbit listener exited with error")


    def rabbitConnect(self):
        try:
            connectData = self.configHandler.getRabbitConn()
            self.host = connectData[0]
            self.port = connectData[1]

            rabbitCredentials = self.configHandler.getRabbitCredentials()

            credentials = pika.PlainCredentials(
                    rabbitCredentials[0],
                    rabbitCredentials[1])
            self.connection = pika.BlockingConnection(
                    pika.ConnectionParameters(
                        self.host, self.port, '/', credentials))
            self.channel = self.connection.channel()
            print("INFO: Initialized RabbitMQ channel on %s:%s" % (
                self.host, self.port))

            self.channel.basic_consume(
                    self.rabbitConsumeCallback,
                    queue=self.queueName)

            self.lthread = threading.Thread(name='rabbit-listener',
                    target = self.rabbitListen,
                    args = [])
            self.lthread.start()

        except Exception as e:
            traceback.print_exc()
            sys.exit(1)

    def basicGetTrace(self, id):
        print("INFO: Retrieving trace id [%s] from rabbit queue" % id)
        return self.mongoHandler.findOne(id)

    def ack_message(self, delivery_tag):
        self.channel.basic_ack(delivery_tag)

    def getTraceFromDB(self):
        (method, id) = self.queue.get()
        self.ack_message(method.delivery_tag)

        id = id.decode('ascii')

        return self.basicGetTrace(id)

    def getQueueSize(self):
        print("INFO: queue size: %d consumedTestcases %d addedTestcases %d" %
                (self.queue.qsize(), self.consumedTestcases,
                    self.addedTestcases))

    def getExistingTrace(self, contentBuffer):
        byteStream = ordArrayToByteStream(contentBuffer)
        id = sha1Sum(byteStream)
        print("INFO: Getting trace for id: %s" % id)

        return self.basicGetTrace(id)

    def getTrace(self, inputString=None, tracerProcess=None):
        '''
            - if driverPresent and inputString, then a new testcase
            is added to mongo to be traced and the result is and existing
            mongo trace. Not sure if the genetic algorithm counts on a
            certain specific trace, or it can be any trace from db
            - if not driverPresent, the inputString is passed to one of
            the running simpletracer processes. The function waits for the
            trace and returns it to population handlers
        '''

        if self.driverPresent:
            if inputString:
                ## this is the generation of a new testcase. Log it
                ## to disk for the moment
                if self.mongoHandler.insert(inputString):
                    writeTestcaseToDisk(inputString, getResultsPath())
                    self.addedTestcases += 1
            ## in this situation, the individual is modified
            data, trace = self.getTraceFromDB()
            if not trace:
                print("ERROR: Could not find new trace in fs. Exiting ...")
                sys.exit(1)
            self.consumedTestcases += 1
            return (byteStreamToOrdArray(data), trace)

        else:
            if inputString is None:
                print("ERROR: non-driver getTrace called with no inputString")
                sys.exit(1)
            writeTestcaseToProcess(len(inputString),
                    bytearray(inputString), tracerProcess, False)

            print("INFO: testcase written to process [%s]" % inputString)

            # Read the size of the returned buffer and data
            receivedOutputSize = tracerProcess.stdout.read(4)
            assert(receivedOutputSize != 0)

            streamSize = struct.unpack("I", receivedOutputSize)[0]
            streamData = tracerProcess.stdout.read(streamSize)

            return (None, streamData)

