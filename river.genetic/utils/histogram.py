import numpy as np
import matplotlib
matplotlib.use('TkAgg')
import matplotlib.pyplot as plt
import matplotlib.mlab as mlab
from pylab import *

HISTOGRAMS_DIR_NAME = "utils/histograms/"


def getHistogramNameFromTitle(title):
    return title.lower().replace(' ', '_')


def drawHistogram(dataSource, strTitle, strXLabel, strYLabel):
    # the bar lengths
    hashTable = {}
    for spot in dataSource:
        if len(spot) > 1:
            if spot[1] not in hashTable:
                hashTable[spot[1]] = 1
            else:
                hashTable[spot[1]] = hashTable[spot[1]] + 1

    keys = []
    values = []
    for key, value in hashTable.items():
        keys.append(key)
        values.append(value)

    pos = arange(len(hashTable))+.5    # the bar centers on the y axis

    fig = plt.figure(1)
    plt.barh(pos, values, align='center')
    plt.yticks(pos, keys)
    plt.xlabel(strXLabel)
    plt.ylabel(strYLabel)
    plt.title(strTitle)
    plt.grid(True)

    plt.show()   # uncomment this statement in order to show the plot 

    plt.draw()
    fig.savefig(HISTOGRAMS_DIR_NAME +
                getHistogramNameFromTitle(strTitle) + ".png")
