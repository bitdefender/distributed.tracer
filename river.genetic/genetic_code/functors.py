import sys
import subprocess
import utils
from utils import TraceImporter
import struct

# Functors used for evaluation purposes
class EvalFunctors:
    def __init__(self, ProbabilityMap, noEdgeProbability, Mapping, entryTemplate, tracerProcess, traceImpoter):
        self.ProbabilityMap 	= ProbabilityMap
        self.noEdgeProbability 	= noEdgeProbability
        self.Mapping 			= Mapping
        self.tracerProcess      = tracerProcess
        self.parentWorker       = None


        self.entryTemplate      = entryTemplate
        self.traceImpoter       = traceImpoter
        #self.headerFtm          = entryTemplate.hF
        #self.headerSize         = entryTemplate.hS
        #self.offsetFtm          = entryTemplate.oF
        #self.offsetSize         = entryTemplate.oS
        # alignment = 4  # this is the header alignment. how can we get this from code ?
        # alignmentMask = ~(alignment - 1)

    # InputString is a stream of bytes that is needed to evaluate the program
    # We take this and give it as input to the executable and we want to get the trace from it

    def processDataStream(self, dataStream, streamSize):
        hashForEdges = set()  # We don't count an edge if it appears twice
        pathProbability = 1.0

        # Caching some variables for faster access
        entryType_TestName = self.entryTemplate.TN
        entryType_Module = self.entryTemplate.TM
        entryType_Offset = self.entryTemplate.TO

        streamPos = 0
        currModuleName = None
        currentOffsetToEntryIndex = None
        prevEntryIndex = -1
        firstItem = 1
        while streamPos < streamSize:
            currOffset = -1

            entry           = utils.getNextEntryFromStream(dataStream, streamPos, self.entryTemplate)
            type            = entry[0]
            len             = entry[1]
            moduleString    = entry[2]
            currOffset      = entry[3]
            cost            = entry[4]
            jumpType        = entry[5]
            jumpInstruction = entry[6]
            entrySize       = entry[7]
            ##print("type: 0x%X len: %d module:%s offset: 0x%X cost: %d jumpType: 0x%X jumpInstruction: 0x%X %d" % entry)

            streamPos += entrySize

            if type == entryType_Module:
                currModuleName = moduleString
                print(moduleString)
                currentOffsetToEntryIndex = self.Mapping[currModuleName] if currModuleName in self.Mapping else None    # Update the current map to search to
            elif type == entryType_Offset:
                # use here currModuleName#offset

                # Find the current entry index
                currEntryIndex = -1
                if currentOffsetToEntryIndex is not None and currOffset in currentOffsetToEntryIndex:
                    currEntryIndex = currentOffsetToEntryIndex[currOffset]

                if firstItem == 0:  # Don't compute probabilities for the first item because it can be misunderstood as no edge in probabilities graph
                    isNewEdge = True
                    bothNodesAreKnown = currEntryIndex != -1 and prevEntryIndex != -1
                    if bothNodesAreKnown:  # If one of the node doesn't exist always consider it a new edge.
                        isNewEdge = not (prevEntryIndex, currEntryIndex) in hashForEdges
                        if isNewEdge:
                            hashForEdges.add((prevEntryIndex, currEntryIndex))

                    if isNewEdge:
                        edgeProb = self.getEdgeProbability(prevEntryIndex,
                                                           currEntryIndex) if bothNodesAreKnown else self.noEdgeProbability
                        pathProbability = pathProbability * edgeProb

                firstItem = 0
                prevEntryIndex = currEntryIndex

            elif type == entryType_TestName:
                continue  # we are not interested in this type of data

        return 1.0 - pathProbability

    # Get the probability of an edge knowing the probability map and the
    # noEdgeProbability value, as defined in the computeProbabilitiesMap function.
    def getEdgeProbability(self, idA, idB):
        neighbOfA = self.ProbabilityMap[idA]  # get the dictionary of neighboors for node idA
        if neighbOfA == None:
            return self.noEdgeProbability

        edgeValue = neighbOfA.get(idB)
        return edgeValue if edgeValue != None else self.noEdgeProbability

    # This function currently tests the program against an input,
    # gets the Trace and computes the probability of the path.
    # Fitness score is 1-pathProbability.
    # We don't consider same edge twice.
    # We must play/improve this a lot. E.g. - consider that first part of
    # the path could be very common and this should influence less the costs.
    def evaluate(self, newTrace=True, inputString=None, maxRetry=10):
        if maxRetry == 0:
            print("ERROR: Evaluation failed because the maximum number of retries was reached.")
            sys.exit(-1)
        if newTrace:
            data, stream = self.traceImpoter.getTrace();
        else:
            data, stream = self.traceImpoter.getTrace(inputString,
                    self.tracerProcess)
        if not stream:
            print("WARN: Trace is empty. %d retries left" % maxRetry)
            return self.evaluate(newTrace, inputString, maxRetry - 1)
        else:
            return (data, self.processDataStream(stream, len(stream)))


