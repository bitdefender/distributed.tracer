import re
import os
import csv
import sys
import json
import requests
from functools import reduce

## plot
import pandas
import numpy as np
import matplotlib.pyplot as plt

BENCHMARKING_DIR_RE=re.compile(r'([0-9a-f]{24})_(\d+)_(\d+)')

def get_current_directory():
    return os.path.dirname(os.path.realpath(__file__))

benchmarking_dir = os.path.dirname(os.path.dirname(get_current_directory())) + "/benchmarks"
baseline_dir = os.path.dirname(os.path.dirname(get_current_directory())) + "/baseline-benchmarks"

def read_csv(path):
    res = {}
    with open(path, 'r') as csv_file:
        r = csv.reader(csv_file, delimiter='\t')
        for row in r:
            if not row[0] in res:
                res[row[0]] = []
            res[row[0]].append(int(row[2]))

    return res

def get_context():
    ## input: none
    ## output: [(benchmark:[results_dir])]
    benchmarks = {}

    ## get all cardinal sws
    url = "https://10.18.0.32:8443/api/executables"
    JWT_TOKEN = os.getenv("JWT_TOKEN")
    headers = {'authorization' : "Bearer " + JWT_TOKEN}
    response = requests.get(url, headers=headers, verify=False)

    execs = json.loads(response.text)
    for e in execs:
        benchmarks[e['id']] = {}
        benchmarks[e['id']]['name'] = e['name']
        benchmarks[e['id']]['dirs'] = []

    assert len(benchmarks) > 0, "No executables found in Cardinal database"

    ## iterate through benchmarking dir
    ## to get the results
    print("Searching for benchmarking dirs in: %s" % benchmarking_dir)

    results = BENCHMARKING_DIR_RE.findall(' '.join(os.listdir(
        benchmarking_dir)))

    assert len(results) > 0, "No cardinal data found"

    for (id, runs, repetition) in results:
        benchmarks[id]['dirs'].append(id + '_' + runs + '_' + repetition)

    return benchmarks

def to_average(data):
    for b in data:
        for r in data[b]:
            l = data[b][r]
            data[b][r] = reduce(lambda x, y: x + y, l) / len(l)
    return data

def normalize(baseline, cardinal):
    pass
    for k in cardinal:
        for run in list(cardinal[k]):
            if run in baseline[k]:
                cardinal[k][run] = cardinal[k][run] / baseline[k][run]
            else:
                cardinal[k].pop(run, None)

    return cardinal

def generate_graph(baseline, cardinal):
    cardinal = to_average(cardinal)
    baseline = to_average(baseline)

    data = normalize(baseline, cardinal)

    df = pandas.DataFrame.from_dict(data, orient='index').sort_index()
    df.plot(kind='barh')
    plt.show()

def get_baseline_results(names):
    baseline_results = {}
    for n in names:
        baseline_results[n] = {}
        dir = baseline_dir
        csvs = [f for f in os.listdir(dir) if
                (re.match(r'.*-\d+-\d+.csv', f) and f.startswith(n))]
        for c in csvs:
            res = read_csv(dir + '/' + c)
            for k in res:
                if not k in baseline_results[n]:
                    baseline_results[n][k] = []
                baseline_results[n][k] += res[k]
    return baseline_results



def main():
    benchmarks = get_context()

    ## get baseline results
    baseline_results = get_baseline_results([benchmarks[k]['name'] for k in benchmarks])

    cardinal_results = {}
    for id in benchmarks:
        name = benchmarks[id]['name']
        cardinal_results[name] = {}
        if len(benchmarks[id]['dirs']) == 0:
            continue

        dirs = benchmarks[id]['dirs']
        for d in dirs:
            dir = benchmarking_dir + '/' + d + '/logs'
            csvs = [f for f in os.listdir(dir) if
                    re.match(r'eval-[a-zA-z0-9]{8}.csv', f)]

            for c in csvs:
                res = read_csv(dir + '/' + c)
                for k in res:
                    if not k in cardinal_results[name]:
                        cardinal_results[name][k] = []
                    cardinal_results[name][k] += res[k]

    generate_graph(baseline_results, cardinal_results)


    ## for Cardinal, data is stored in dir/logs/eval-*
    ## compute: {benchmark: [(run, avg-cov)]}


if __name__ == '__main__':
    print("This script plots coverage (normalized) for all available benchmarks")
    print("The benchmarking data is read from: %s" % (
        os.path.dirname(get_current_directory())))
    print("The assuption is that baseline results are stored in: [0-9a-f]{24}")
    print("The assuption is that Cardinal results are stored in: [0-9a-f]{24}_\d+_\d+")
    main()

