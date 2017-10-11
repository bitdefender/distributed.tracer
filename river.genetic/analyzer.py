import os
import re
from utils import histogram
from utils import directory


def get_log_file(path):
    file_descriptor = open(path,
                           "r",
                           encoding="latin-1",
                           errors="ignore")
    return file_descriptor


def get_hot_cold_spots_count(log_file):
    hash_table = {}
    for line in log_file.readlines():
        if line not in hash_table:
            hash_table[line] = 1
        else:
            hash_table[line] = hash_table[line] + 1

    return hash_table


def getY(entry):
    if len(entry) < 2:
        return -1
    return entry[1]


def get_spots_from_hash(hash_table):
    entries = []
    for key, value in hash_table.items():
        entries.append([key, value])

    return entries


def get_hot_cold_spots(log_file_path):
    log_file = get_log_file(log_file_path)

    hash_table = get_hot_cold_spots_count(log_file)
    all_spots = get_spots_from_hash(hash_table)
    all_spots.sort(reverse=True, key=getY)

    hot_spots = []
    cold_spots = []

    for spot in all_spots:
        if len(spot) > 1:
            if spot[1] == 1:
                cold_spots.append(spot)
            else:                        # consider a spot to be hot spot
                hot_spots.append(spot)   # only if it appears by more than once

    return hot_spots, cold_spots


def print_spots(spots_type, spots, output_dir_name):
    file_name = ""
    if spots_type is "hot":
        file_name = "hot_spots.txt"
    else:
        if spots_type is "cold":
            file_name = "cold_spots.txt"

    if file_name is "":
        return

    file_descriptor = open(output_dir_name + "/" + file_name,
                           "w",
                           encoding="latin-1")

    for spot in spots:
        if len(spot) > 1:
            file_descriptor.write(spot[0])


def main():
    log_file_path = os.path.join(".", "logs/log.txt")

    hot_spots, cold_spots = get_hot_cold_spots(log_file_path)

    print("Number of hot spots", len(hot_spots))
    print("Number of cold spots", len(cold_spots))
    print("\nThe actual hot and cold spots are in output_files directory.")

    output_dir_name = "output_files"
    directory.createDirectory(output_dir_name)
    print_spots("hot", hot_spots, output_dir_name)
    print_spots("cold", cold_spots, output_dir_name)

    histogram.drawHistogram(hot_spots, \
                            "Count frequencies of hot spots", \
                            "Appearences", \
                            "Number of times a hotspot was visited")


if __name__ == "__main__":
    main()
