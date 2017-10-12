require('dotenv').config();

const util = require("util");

const pm2 = require("pm2");
const randomstring = require("randomstring");


const processes = require("./processes.json");
const resources = require("./resources.json");

const managedPrefix = "driver.";

var usage = {};

function EmptyProcess() {
  return {
    allids: [],
    started: [],
    stopped: []
  };
}

function infolog(msg) {
  console.log("[PM][INFO] " + msg);
}

function UpdateResources(cb) {
  /*for (var i in processes) {
    console.log(i);
    usage[i] = EmptyProcess();
  }*/
  usage = {};
  var agg = {};
  var idLookup = {};

  pm2.list((err, list) => {
    for (var i in list) {
      var name = list[i].name;
      var pmid = list[i].pm_id;
      var pid = list[i].pid;

      if (name.startsWith(managedPrefix)) {
        name = name.substr(0, name.lastIndexOf("."));
        pname = name.substr(0, name.lastIndexOf("."));

        idLookup[pmid] = pname;

        if (!(name in usage)) {
          usage[name] = EmptyProcess();
        }

        if (!(pname in agg)) {
          agg[pname] = EmptyProcess();
        }

        usage[name].allids.push(pmid);

        if (0 != pid) {
          usage[name].started.push(pmid);
          agg[pname].started.push(pmid);
        } else {
          usage[name].stopped.push(pmid);
        }
      }
    }

    cb(usage, agg, idLookup);
  });
}

function CreateProcesses(processName, execId, processArgs, count, cb) {
  if (0 == count) {
    cb();
    return;
  }

  var mpid = randomstring.generate(8);
  var pmName = managedPrefix + processName + "." + execId + "." + mpid;
  var cfg = {
    name: pmName,
    script: processes[processName].script,
    cwd: processes[processName].cwd,
    exec_mode: 'fork',
    instances: 1,
    kill_timeout : 3000,
    args: []
  };

  if (!(processName in processes)) {
    console.log(processName + " not found in processes.json\n");
    cb();
    return;
  }

  if (processName.indexOf("fuzzer") != -1) {
    cfg.script = util.format(cfg.script, execId);
    cfg.cwd = util.format(cfg.cwd, execId);
  }

  if ("griver" == processName) {
    // griver - read pairs of arguments from config json
    if ("args" in processes[processName]) {
      var len = processes[processName].args.length;
      for (var i = 0; i < len - 1; i+=2) {
        var key = processes[processName].args[i];
        var value = processes[processName].args[i+1];

        if ("--executableId" == key) {
          value = util.format(value, execId);
        }
        cfg.args.push(key);
        cfg.args.push(value);
      }
    }

  } else {

    if ("args" in processes[processName]) {
      for (var i in processes[processName].args) {
        var arg = processes[processName].args[i];

        if (processName.indexOf("fuzzer") != -1) {
          if (arg.indexOf("-binary_id=") != -1) {
            arg = util.format(arg, execId);
          }
          if (arg.indexOf("-results_csv=") != -1) {
            arg = util.format(arg, mpid);
          }
        }
        cfg.args.push(arg);
      }
    }
  }

  for (var i = 0; i < processArgs.length; ++i) {
	  cfg.args.push(processArgs[i]);
  }

  if ((processName == "tracer.node") ||
    (processName == "state.aggregator")) {
      cfg.args.push(execId);
  }

  if ("env" in processes[processName]) {
    cfg.env = processes[processName].env;

    if ("griver" == processName) {
      var arg = cfg.env["SIMPLETRACERLOGSPATH"];
      cfg.env["SIMPLETRACERLOGSPATH"] = util.format(arg, cfg.cwd, execId);
    }
    //console.dir(cfg.env);
  }

  if ("autorestart" in processes[processName]) {
    cfg.autorestart = processes[processName].autorestart;
  }

  if ("minUptime" in processes[processName] &&
  "maxRestarts" in processes[processName]) {
    cfg.minUptime = processes[processName].minUptime;
    cfg.maxRestarts = processes[processName].maxRestarts;
  }

  if ("logfile" in processes[processName]) {
    cfg.log_file = util.format(processes[processName].logfile, execId, mpid);
  }

  if ("interpreter" in processes[processName]) {
    cfg.interpreter = processes[processName].interpreter;
    if ("interpreterArgs" in processes[processName]) {
      cfg.interpreterArgs = processes[processName].interpreterArgs;
    }
  }

  //console.dir(cfg);

  pm2.start(cfg, function(err, np) {
    if (!np) {
      console.log(err);
      process.exit(1);
    }
    var name = np.name;
    var pmid = np.pm_id;
    var pid = np.pid;

    if (!(name in usage)) {
      usage[name] = EmptyProcess();
    }

    usage[name].allids.push(pmid);

    if (0 != pid) {
      usage[name].started.push(pmid);
    } else {
      usage[name].stopped.push(pmid);
    }

    CreateProcesses(processName, execId, processArgs, count - 1, cb);
  });
}

function StartProcesses(name, count, cb) {
  if (0 == count) {
    cb();
    return;
  }

  pm2.restart(usage[name].stopped[0], (err) => {
    if (err) {
      console.log(err);
      return;
    }

    UpdateResources(() => {
      StartProcesses(name, count - 1, cb);
    });
  });
}

function DeleteProcesses(name, count, cb) {
 if (0 == count) {
    cb();
    return;
  }

  var killId = usage[name].allids[0];
  pm2.delete(killId, (err) => {
    if (err) {
      console.log(err);
      return;
    }

    UpdateResources(() => {
      DeleteProcesses(name, count - 1, cb);
    });
  });

}

function StopProcesses(name, count, cb) {
  if (0 == count) {
    cb();
    return;
  }

  var killId = usage[name].started[0];
  pm2.stop(killId, (err) => {
    if (err) {
      console.log(err);
      return;
    }

    UpdateResources(() => {
      StopProcesses(name, count - 1, cb);
    });
  });
}

function EnsureRunning(processName, execId, count, processArgs, cb) {
  var pmName = "driver." + processName + "." + execId;

  UpdateResources((usg, agg) => {

    if (!(pmName in usg)) {
      usg[pmName] = EmptyProcess();
    }
    if (count > usg[pmName].started.length) {

      var mx = 0, st = 0;

      if (!(pmName in usage)) {
        usage[pmName] = EmptyProcess();
      }

      var pmAggName = "driver." + processName;
      if (pmAggName in agg) {
        st = agg[pmAggName].started.length;
      }

      if (processName in resources) {
        mx = resources[processName] - st;

        if (count > mx) {
          count = mx;
        }
      }

      infolog(pmName + ": Starting " + count + " processes!");

      var start = Math.min(count, usg[pmName].stopped.length);
      StartProcesses(pmName, start, () => {
        if (count - start > 0) {
          CreateProcesses(processName, execId, processArgs, count - usg[pmName].started.length, cb);
        } else {
          cb();
        }
      });
    } else {
      if ("autorestart" in processes[processName] &&
        !processes[processName].autorestart) {
          infolog("Delete proc:" + processName);
          var st = usg[pmName].allids.length;
          DeleteProcesses(pmName, st - count, cb);
      } else {
        infolog("Stop proc: " + processName);
        var st = usg[pmName].started.length;
        StopProcesses(pmName,  st - count, cb);
      }
    }
  });
}

function ConnectPM2(cb) {
  pm2.connect((err) => {
    if (err) {
      cb(err);
      return;
    }

    UpdateResources(cb);
  });
}

function Status(cb) {
  UpdateResources((usg) => {
    var ret = {};

    for (var i in resources) {
      ret[i] = {
        max: resources[i],
        running: []
      };
    }

    for (var i in usg) {
      console.log(i);
      var psep = i.indexOf(".");
      var ssep = i.lastIndexOf(".");

      var proc = i.substring(psep + 1, ssep);
      var execId = i.substring(ssep + 1);

      if (usg[i].started.length > 0) {
        if (!(proc in ret)) {
          ret[proc] = {
            max: 0,
            running: []
          }
        }

        for (var j in usg[i].started) {
          ret[proc].running.push({
            execId: execId,
            pmid: usg[i].started[j]
          });
        }
      }
    }

    cb(ret);
  });
}

function TerminateProcess(pmid, cb) {
  UpdateResources((usage, agg, idLookup) => {
    var killFunc = pm2.stop;
    var pname = idLookup[pmid];

    pname = pname.substr(pname.indexOf('.') + 1);
    if (!(pname in processes)) {
      console.log(pname + " not found\n");
      console.dir(idLookup);
      cb();
      return;
    }

    if ("autorestart" in processes[pname] &&
      !processes[pname].autorestart) {
        killFunc = pm2.delete;
    }
    killFunc.call(pm2, pmid, (err) => {
      cb(err);
    });
  });
}

module.exports = exports = {
  "connect" : ConnectPM2,
  "ensureRunning" : EnsureRunning,
  "status" : Status,
  "terminate" : TerminateProcess
  //"updateResources" : UpdateResources
};
