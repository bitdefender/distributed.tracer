import glob
import argparse
import sys
import os
import functools
from worker import TestWorker, DriverWorker
from functors import EvalFunctors
from utils import TraceImporter, ConfigHandler, MongoHandler
import utils
import probabilities
import time
import struct


def createSimpleTracerProcesses(outListOfProcesses, Params):
    cmd = utils.createTracerCmd(Params)
    for i in range(Params.numTasks):
        p = utils.createTracerProcess(cmd, int(Params.inputLength))
        outListOfProcesses.append(p)

def stopSimpleTracerProcesses(listOfProcesses):
    for p in listOfProcesses:
        utils.stopTracerProcess(p)


def getTestWorkers(traceImporter, Params, tracerProcesses):
    workers = []
    ## to be fixed
    recreateTracerProcessAtEachNewFolder = True

    for i in range(Params.numTasks):

        # TODO CPaduraru: see other comments about the the spark / process optimization.
        evalFunctor = EvalFunctors(probabilities.Probability,
                probabilities.noEdgeProbability,
                probabilities.blockOffsetToIndex,
                Params.entryTemplate,
                None if recreateTracerProcessAtEachNewFolder else tracerProcesses[i],
                traceImporter)

        worker = TestWorker(evalFunctor,  # fitness functor
                Params.populationSize, Params.inputLength, Params.numberOfIterations,
                Params.elitismPercent,
                Params.oldGenerationP,
                Params.mutationP,
                Params.deltaMutate,
                Params.thresholdForLocalMaxima,
                recreateTracerProcessAtEachNewFolder, utils.createTracerCmd(Params), int(Params.inputLength))
        workers.append(worker)
    return workers

def getDriverWorkers(traceImporter, Params, tracerProcesses):
    workers = []
    ## to be fixed
    recreateTracerProcessAtEachNewFolder = True
    for i in range(Params.numTasks):

        # TODO CPaduraru: see other comments about the the spark / process optimization.
        evalFunctor = EvalFunctors(probabilities.Probability,
                probabilities.noEdgeProbability,
                probabilities.blockOffsetToIndex,
                Params.entryTemplate,
                None if recreateTracerProcessAtEachNewFolder else tracerProcesses[i],
                traceImporter)

        worker = DriverWorker(evalFunctor,  # fitness functor
                Params.populationSize,
                Params.inputLength,
                Params.numberOfIterations,
                Params.elitismPercent,
                Params.oldGenerationP,
                Params.mutationP,
                Params.deltaMutate,
                Params.thresholdForLocalMaxima,
                )
        workers.append(worker)
    return workers

def mapReduce(sparkContext, workers, taskCount, driverPresent):
    # I would expect to use defaultParallelism and split the workers list on each worker, equall chunks
    workersRDD = sparkContext.parallelize(workers)
    print("INFO: Sent %d workers to Spark" % taskCount)

    # TODO: make sure that data is not copied in an inneficient way !
    reduceFptr = DriverWorker.reduce if driverPresent else TestWorker.reduce
    workerRes = workersRDD.map(lambda w: w.solve()).reduce(lambda w1, w2: reduceFptr(w1, w2))
    return workerRes

def serial(workers, taskCount, debugEnabled, driverPresent):
    print("INFO: Starting serial execution")

    workers[0].solve(debugEnabled)
    workerRes = workers[0]

    reduceFptr = DriverWorker.reduce if driverPresent else TestWorker.reduce

    for i in range(1, taskCount):
        # Send first parameter as True for debugging population at each generation
        workers[i].solve(debugEnabled)
        workerRes = reduceFptr(workerRes, workers[i])

    return workerRes

def execute(sparkContext, traceImporter, Params, tracerProcesses):
    # Generate new worker tasks.
    workers = getDriverWorkers(traceImporter, Params, tracerProcesses) \
            if Params.driver else \
            getTestWorkers(traceImporter, Params, tracerProcesses)

    if sparkContext:
        result = mapReduce(sparkContext, workers, Params.numTasks, Params.driver)
    else:
        result = serial(workers, Params.numTasks, Params.DEBUG_ENABLED, Params.driver)

    return result


def runApp(configHandler, mongoHandler, traceImporter, Params):
    sc = None
    if Params.isParallelExecution:
        sc = utils.createSparkContext(Params)
        print ("NUMBER OF TASKS USED = " + str(Params.numTasks) + \
                " PlEASE provide correct number should be a factor of number of workers (e.g. 5 * NUM WORKERS). PySpark API doesn't know number of workers :(")

    # TODO CPaduraru: hacked see the other comments in this file about spark / serialization of process issue
    recreateTracerProcessAtEachNewFolder = True # isParallelExecution

    # One tracer process opened for each task. Basically these will be working processes sleeping most of the time so it shouldn't affect performance
    tracerProcesses = []
    if not recreateTracerProcessAtEachNewFolder:
        createSimpleTracerProcesses(tracerProcesses, Params)
    #---

    t0 = time.time()

    testIndex = 0
    previousPopulation = None
    while True:
        print("INFO: Starting generation [%d]" % testIndex)
        # The noEdgeProbability represents the value to use in fitness evaluation when an edge was not encountered yet in the probabilities map
        d = utils.getFolderPathFromId(testIndex)

        if previousPopulation and Params.driver:
            individuals = previousPopulation.getpopulation()
            probabilities.updateFromDB(individuals,
                    traceImporter, Params.entryTemplate)

        workerRes = execute(sc, traceImporter, Params, tracerProcesses)
        previousPopulation = workerRes.population

        # TODO CPaduraru: again a horrible hack because python closure can include a subprocess data.
        # After solve (map part), the tracer process is set on None so we must create it back  to generate new tests folder
        if recreateTracerProcessAtEachNewFolder:
            cmd = utils.createTracerCmd(Params)
            workerRes.evalFunctor.tracerProcess = utils.createTracerProcess(cmd, int(Params.inputLength))
        #-----------

        # TODO Cpaduraru: hack associated with the one above
        if recreateTracerProcessAtEachNewFolder:
            utils.stopTracerProcess(workerRes.evalFunctor.tracerProcess)
        #------
        testIndex += 1

    ## Disconnect from external Driver components
    traceImporter.clear()

    # Now stop all tracer processes
    if not recreateTracerProcessAtEachNewFolder:
        stopSimpleTracerProcesses(tracerProcesses)

    dt = time.time() - t0
    print("Time to solve : %fs" % dt)



def main(argv=None):
    # Short story: We'll create N Tasks
    # Each task is a genetic algorithm which has a population of individuals
    # (each individual represents a test and its represented in memory as
    # an array of bytes)
    # We create N tasks which will compete on W workers available,
    # ideally N should be greater significantly than W to optimize
    # stuff - that's what parameter tasksFactor stands for.
    # Each task will have a number of generations available to optimize things.
    # After this number of iterations, we do a merge operation to select the
    # bests tests from those N workers.
    # The bests tests will be outputed on a new folder with tests,
    # how many folders is defined by testsFolderCount.
    # TODO: many of this parameter should not be optional!
    #       But we keep them optional for easy testing :)
	
	# TODO CPADURARU: environment variables
	# subprocess.Popen("sh stub_env_variables_genetic_code.sh", shell=True)
    Params = utils.readParams()
    ## logs dir is cleared by cardinal and input corpus is added by tracer.node

    configHandler = ConfigHandler(Params.config)
    mongoHandler = MongoHandler(Params.executableId, configHandler)
    traceImporter = TraceImporter(executableId=Params.executableId,
            configHandler=configHandler,
            mongoHandler=mongoHandler,
            driverPresent=Params.driver)

    try:
        runApp(configHandler, mongoHandler, traceImporter, Params)
    except (KeyboardInterrupt, SystemExit) as e:
        print("INFO: Received keyboard interrupt. Exiting ....")
        traceImporter.getQueueSize();
        traceImporter.clear()
        sys.exit(0)

if __name__ == "__main__":
    sys.exit(main())



