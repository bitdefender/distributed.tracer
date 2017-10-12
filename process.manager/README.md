# process.manager
Distributed tracer process manager

## 1. Description
process.manager is a Cardinal component that orcherstrates Cardinal tools: fuzzers, tracers, genetic analyzers, global state handlers, web api.  
All tools are started, stopped or restarted automatically via process.manager. Otherwise, resource management is out of Cardinal control.  
## 2. Usage
```
  node pmcli.js start|stop|kill|status <pmID> <processName> <execId> <instanceCount> [programArgs]
```
    <pmId>            # process Id used by kill command
    <processName>     # process name that should be started, stopped, or queried for status - as configured in processes.json
    <execId>          # executableId that is currently evaluated by Cardinal
    <instanceCount>   # number of instances that should be started in the limit configured in resources.json
    [programArgs]     # command-line arguments of currently evaluated program
