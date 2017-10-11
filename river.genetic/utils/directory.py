import os


def createDirectory(name):
    path = os.path.join('.', name)
    if not os.path.exists(path):
        os.makedirs(path)
