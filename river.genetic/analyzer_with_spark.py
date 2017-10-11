#TODO: now  many input files, format
#TODO: input/output connections

from pyspark import SparkConf, SparkContext
import re
import glob
import argparse
import sys
import csv
import struct
import os
from collections import namedtuple

from parse import *

from utils import histogram
from utils import directory
from genetic_code import utils

ModuleNameToIndex = {}
ModuleIndexToName= []
sc = None
InputFilesPath = None
IsBinaryInput = 0 # Input files are in binary format ?

## /symexec/build/lib/libc.so.6 + 00042EF2 (   2)
## [vdso]          + 00000B70 (   2)
PROGRAM_COUNTER_RE = re.compile(r'(\[?\S+\]?)\s+\+ ([a-fA-F\d]{8}) \(\s+(\d+)\)')

#TODO: binary files are faster
def processLine(line):
    words = line.split()
    return [words[0], words[1], words[2]]


def mapfunc(file):
    logSet = []
    #TODO: put the info on a single file, single row. high OS read file costs
    file_descriptor = None
    if IsBinaryInput == 0: # File as text
        file_descriptor = open(file, \
                               "r", \
                            encoding="latin-1", \
                            errors="ignore")
    else:
        file_descriptor = open(file, "rb")

    if IsBinaryInput == 0:
        for line in file_descriptor.readlines():
            atoms = PROGRAM_COUNTER_RE.findall(line)
            if not atoms:
                continue
            atoms = atoms[0]
            logSet.append([atoms[0], int(atoms[1], 16), int(atoms[2])])
    else:
        # TODO CPaduraru  - must unify this processing here with the one in probabilities.update from folder because it's basically the same thing
        #----------------------------------
        entryType_TestName = 0x0010
        entryType_Module = 0x00B0
        entryType_Offset = 0x00BB
        EntryTemplate = namedtuple("t",
                                   "hF hS oF oS TN TM TO")  # header format, header size, offset format, offset size
        headerFtm = 'h h'
        offsetFtm = 'I h h'
        entryTemplate = EntryTemplate(hF=headerFtm, hS=struct.calcsize(headerFtm), oF=offsetFtm,
                                             oS=struct.calcsize(offsetFtm),
                                             TN=entryType_TestName, TM=entryType_Module, TO=entryType_Offset)

        # Find the size of the stream
        file_descriptor.seek(0, os.SEEK_END)
        streamSize = file_descriptor.tell()
        file_descriptor.seek(0, os.SEEK_SET)
        streamData = file_descriptor.read()

        streamPos = 0
        currModuleName = None

        while streamPos < streamSize:
            entry           = utils.getNextEntryFromStream(streamData, streamPos, entryTemplate)
            type            = entry[0]
            len             = entry[1]
            moduleString    = entry[2]
            offset          = entry[3]
            cost            = entry[4]
            jumpType        = entry[5]
            entrySize       = entry[6]

            streamPos       += entrySize

            if type == entryType_Module:
                currModuleName = moduleString
            elif type == entryType_Offset:
                logSet.append([currModuleName.decode('utf-8'), offset, int(cost)])
            elif type == entryType_TestName:
                continue  # we are not interested in this type of data

            #----------------------------------

    #Zprint(logSet)
    return logSet


# Write CSV output from the two lists with tuples
def writeOutput(costOutput, occurancesOutput):
    costFile 			= open("output_files/out_cost.csv", "w")
    costFileWr 			= csv.writer(costFile, quoting=csv.QUOTE_ALL)
    for line in costOutput:
        costFileWr.writerow(line)

    occurancesFile		= open("output_files/out_occurances.csv", "w")
    occurancesFileWr    = csv.writer(occurancesFile, quoting=csv.QUOTE_ALL)
    for line in occurancesOutput:
        occurancesFileWr.writerow(line)

    legendFile 			= open("output_files/out_legend.csv", "w")
    legendFileWr		= csv.writer(legendFile, quoting=csv.QUOTE_ALL)
    for i in range(0, len(ModuleIndexToName)):
        legendFileWr.writerow([i, ModuleIndexToName[i]])


# Parse parameters and create spark context
def createSparkContext():
    sys.stdout = open('output_files/out_log.txt', 'w')

    parser = argparse.ArgumentParser()

    parser.add_argument("-folderPath",
                        help="path to the folder containing all input files. "
                        "App will read all txt files from this folder")

    parser.add_argument("--binaryInput",
                        help="Set this if you want to have binary input files", type=int, default=1)

    parser.add_argument("--master",
                        help="master of execution. By default is 'local' machine")
    parser.add_argument("--executorMemory",
                        help="num gigabytes of ram memory that you allow spark to use "
                             "on executor machines. By default we are using 1 gigabyte",
                        type=int)
    parser.add_argument("--appName",
                        help="name of the application - used for tracking purposes. "
                             "By default is 'myapp'")
    args = parser.parse_args()

    parameterMaster = "local" if args.master is None else str(args.master)
    parameterMemory = "1g" if args.master is None else (str(args.executorMemory) + "g")
    parameterAppName = "MyApp" if args.appName is None else str(args.appName)
    #print "Usage: " + parameterMaster + " " + parameterMemory + " " + parameterAppName

    global InputFilesPath
    InputFilesPath = args.folderPath + "/**/*.*"
    global IsBinaryInput
    IsBinaryInput  = 1 if args.binaryInput is not None else 0

    # Setup spark context
    conf = (SparkConf()
            .setMaster(parameterMaster)
            .setAppName(parameterAppName)
            .set("spark.executor.memory", parameterMemory))

    conf = (SparkConf()
            .setMaster("local")
            .setAppName("myapp")
            .set("spark.executor.memory", "1g"))

    global sc
    sc = SparkContext(conf = conf)


def main(argv=None):
    # Create output_files directory
    outputDirectoryName = "output_files"
    directory.createDirectory(outputDirectoryName)

    createSparkContext()

    filesList = glob.glob(InputFilesPath)
    ''' Sample file to write for inspecting content of data structures
    '''
    #sampleFileDescriptor = open("sample_inspect_content.txt", "w")


    #print("num files found ", filesList.count())
    #print (filesList)
    #mapfunc(filesList[0])
    textFile = sc.parallelize(filesList) # TODO: split in many tasks here
                                         #       to load balance correctly

    # allEntries contains the pairs [file, offset, overhead] from all files
    allEntries = textFile.map(mapfunc).flatMap(lambda x: x)
    allEntries.cache()  # TODO: does cache keeps the files on each node ?

    # Find all module names then transfor the entries
    # map with [fileID, offset, overhead]. Do this to have less data to copy
    modulesListRDD = allEntries.map(lambda x:x[0]+"#"+str(x[1])).distinct()
    # moduleName#OFFSET   TODO optimize this

    # Create the map between (module string -> index).
    # This will be used later to avoid string processing
    moduleIndex = 0
    modulesList = modulesListRDD.collect()
    for module in modulesList:
        ModuleNameToIndex[module] = moduleIndex
        ModuleIndexToName.append(module)
        moduleIndex = moduleIndex + 1

    #  TODO: join some parts of the operations ?
    #        For example the string concatenation data
    # -----------
    # Convert entries to index then cache result.
    # This will be computed in two rdd actions after.
    # If we wouldn't cache the result,
    # the hash search operation will be produced twice!
    allEntriesTransf 			= allEntries.map(lambda x: (ModuleNameToIndex[x[0] + "#" + str(x[1])], x[2]))	\
                                            .cache()

    # Inverse the keys to sort then display correctly
    allEntriesTransfCost 		= allEntriesTransf.map(lambda x: (x[0], x[1]))	\
                                                  .reduceByKey(lambda x, y: x + y) \
                                                  .map(lambda x: (x[1], x[0])).sortByKey().map(lambda x: (x[1], x[0])) \
                                                  .map(lambda x: (ModuleIndexToName[x[0]], x[1]))

    allEntriesTransfOccurances 	= allEntriesTransf.map(lambda x : (x[0], x[1])) \
                                                  .reduceByKey(lambda x, y: x + y) \
                                                  .map(lambda x: (x[1], x[0])).sortByKey().map(lambda x: (x[1], x[0])) \
                                                  .map(lambda x: (ModuleIndexToName[x[0]], x[1]))
    # -----------
    # Collect results to lists
    costOutput 			= allEntriesTransfCost.collect()
    occurancesOutput 	= allEntriesTransfOccurances.collect()

    # Output to csv files
    writeOutput(costOutput, occurancesOutput)

    '''
    sampleFileDescriptor.write(str(len(occurancesOutput)))
    for x in occurancesOutput:
        sampleFileDescriptor.write(str(x))
        sampleFileDescriptor.write("\n\n")
    '''

    histogram.drawHistogram(occurancesOutput, \
                            "Num occurances", \
                            "Spots", \
                            "Count")
    histogram.drawHistogram(costOutput, \
                            "Overall cost per spot", \
                            "Spots", \
                            "Count")


if __name__ == "__main__":
    sys.exit(main())
