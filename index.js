"use babel";

import {BufferedProcess} from "atom";

export function configSet(scope, opts) {
  for (const key of Object.keys(opts)) {
    atom.config.set(`${scope}.${key}`, opts[key]);
  }
}

export function usePackage(name, opts = {}) {
  // Set package config from the `config` object
  if (typeof opts.config === "object") {
    configSet(name, opts.config);
  }

  install(name).then(() => {
    // If `enableKeys` is true, add package to disable-keybindings exceptions.
    if (opts.enableKeys == true) {
      const l = atom.config.get("disable-keybindings.exceptCommunityPackages");
      if (l.indexOf(name) < 0) {
        l.push(name);
      }
      atom.config.set("disable-keybindings.exceptCommunityPackages", l);
    }

    // If a keymap is specified, insert it.
    if (typeof opts.keymap === "object") {
      const k = {};
      for (const selector of Object.keys(opts.keymap)) {
        const m = opts.keymap[selector];
        const o = {};
        for (const key of Object.keys(m)) {
          let cmd = m[key];
          if (cmd.indexOf(":") < 0) {
            cmd = `${name}:${cmd}`;
          }
          o[key] = cmd;
        }
        k[selector] = o;
      }
      atom.keymaps.add(`${__filename}/${name}`, k);
    }

    // Run init code if present.
    if (typeof opts.init === "function") {
      opts.init();
    }
  });
}

function apm(args) {
  return new Promise(resolve => {
    const output = [], error = [];
    new BufferedProcess({
      command: atom.packages.getApmPath(),
      args,
      stdout: lines => output.push(lines),
      stderr: lines => error.push(lines),
      exit: code =>
        resolve({code, stdout: output.join("\n"), stderr: error.join("\n")})
    });
  });
}

function apmLoad(name) {
  return apm(["view", name, "--json"]).then(({code, stdout, stderr}) => {
    if (code === 0) {
      return JSON.parse(stdout);
    }
    const error = new Error(`Fetching package ${name} failed.`);
    error.stdout = stdout;
    error.stderr = stderr;
    throw error;
  });
}

function apmInstall({name, version, theme, apmInstallSource}) {
  const activateOnSuccess = !theme && !atom.packages.isPackageDisabled(name);
  const activateOnFailure = atom.packages.isPackageActive(name);
  if (atom.packages.isPackageActive(name)) {
    atom.packages.deactivatePackage(name);
  }
  if (atom.packages.isPackageLoaded(name)) {
    atom.packages.unloadPackage(name);
  }

  const packageRef = apmInstallSource
    ? apmInstallSource.source
    : `${name}@${version}`;
  return apm(["install", packageRef]).then(({code, stdout, stderr}) => {
    if (code === 0) {
      if (activateOnSuccess) {
        atom.packages.activatePackage(name);
      } else {
        atom.packages.loadPackage(name);
      }
    } else {
      if (activateOnFailure) {
        atom.packages.activatePackage(name);
      }
      const error = new Error(`Installing \u201C${packageRef}\u201D failed.`);
      error.stdout = stdout;
      error.stderr = stderr;
      error.packageInstallError = !theme;
      throw error;
    }
  });
}

const queue = {
  items: [], // work items: { name, resolve, reject }
  idle: true, // true if no work item is currently running
  note: null, // active notification
  scheduled: 0, // count of items scheduled since last idle
  failed: 0 // count of failed items since last idle
};

function install(name) {
  if (atom.packages.getAvailablePackageNames().indexOf(name) >= 0) {
    return Promise.resolve(true);
  }
  return addToQueue(name);
}

function addToQueue(name) {
  return new Promise((resolve, reject) => {
    queue.scheduled += 1;
    queue.items.push({name, resolve, reject});
    setTimeout(
      () => {
        if (queue.idle) {
          processQueue();
        }
      },
      0
    );
  });
}

function update(label) {
  if (queue.note) queue.note.dismiss();
  queue.note = atom.notifications.addInfo(label, {
    icon: "squirrel",
    dismissable: true
  });
}

function done(label) {
  if (queue.note) queue.note.dismiss();
  queue.note = atom.notifications.addSuccess(label, {
    icon: "squirrel",
    dismissable: false
  });
}

function processQueue() {
  if (queue.items.length === 0) {
    queue.idle = true;
    if (queue.scheduled > 0) {
      if (queue.failed > 0) {
        done(
          `Installed ${queue.scheduled -
            queue.failed} packages, ${queue.failed} failed.`
        );
      } else {
        done(`Installed ${queue.scheduled} packages.`);
      }
      queue.scheduled = 0;
      queue.failed = 0;
    }
    return;
  }

  queue.idle = false;
  const next = queue.items.shift();
  update(
    `Installing package "${next.name}" (${queue.scheduled -
      queue.items.length} of ${queue.scheduled})`
  );
  installPackage(next.name).then(
    () => {
      setTimeout(processQueue, 0);
      next.resolve(true);
    },
    err => {
      setTimeout(processQueue, 0);
      next.reject(err);
    }
  );
}

function installPackage(name) {
  return apmLoad(name)
    .then(pkg => apmInstall(pkg), err => {
      atom.notifications.addError(`Unknown package '${name}'`);
      throw err;
    })
    .catch(err => {
      atom.notifications.addError(`Failed to install '${name}'`);
      throw err;
    });
}
