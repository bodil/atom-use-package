# atom-use-package

`atom-use-package` lets you install and configure your Atom packages entirely from your Atom init script.

Heavily inspired by John Wiegley's [use-package](https://github.com/jwiegley/use-package) system for Emacs.

## Usage

`atom-use-package` provides the `usePackage` function, which takes care of installing and configuring Atom packages from your `.atom/init.js` file. The advantage of this is that you can easily maintain (and, perhaps more importantly, keep in version control) a consistent Atom configuration across multiple computers and OS installations.

The recommended way to install this is in your `.atom` folder:

```sh
$ cd ~/.atom
$ npm install atom-use-package
```

In this way, you can simply `import` it in your `init.js` file (or `require` it in your `init.coffee` file, if you prefer that sort of thing):

```js
import {usePackage} from "atom-use-package";
```

### `usePackage`

`usePackage` takes a package name and an optional configuration object. It will check if the package is already installed, run `apm install` for you if it's not, then go ahead and configure it according to your specifications.

The configuration object looks like this (and all the keys are optional):

```js
type Configuration = {
  config: Object;
  keymap: Object;
  init: Function;
  enableKeys: Boolean;
}
```

The `config` property takes an object of configuration keys and values, and updates the Atom configuration accordingly. The keys will be automatically namespaced to the package you're configuring: `usePackage("my-package", {config: {enableFeature: true}})` will result in the configuration key `my-package.enableFeature` being set to `true`.

As an example, here is how you'd install the [build](https://atom.io/packages/build) package and configure it to automatically trigger builds on save:

```js
usePackage("build", {
  config: {
    buildOnSave: true
  }
});
```

The `keymap` property is used to define package specific keymaps. Commands without a prefix will be automatically prefixed with the package you're configuring. For instance, to install the `linter` package and define your own custom keybindings for `linter:next-error` and `linter:previous-error`:

```js
usePackage("linter", {
  keymap: {
    "atom-workspace atom-text-editor:not([mini])": {
      "alt-n": "next-error",
      "alt-p": "previous-error"
    }
  }
});
```

The `init` property takes a function which will be called once the package is installed and everything else is configured. For instance, you could use it to set a particular UI theme while leaving the syntax theme unchanged, which can't easily be done using `config`:

```js
usePackage("atom-material-ui", {
  init: () => {
    const syntax = atom.config.get("core.themes")[1];
    atom.config.set("core.themes", ["atom-material-ui", syntax]);
  }
});
```

Finally, the `enableKeys` property is a special case for users of the [disable-keybindings](https://atom.io/packages/disable-keybindings) package. If this is `true`, the name of the package you're configuring will be added to the `disable-keybindings.exceptCommunityPackages` configuration value, so that the package's own bundled keybindings will be activated.

If you intend to use `enableKeys`, you should first install the `disable-keybindings` package like this:

```js
usePackage("disable-keybindings", {
  config: {
    allCommunityPackages: true,
    exceptCommunityPackages: []
  }
});
```

### `configSet`

In addition to `usePackage`, the `atom-use-package` module exports the `configSet(scope, options)` function. This is the function `usePackage` calls to set config options, scoped to the current package, but you might want to use this function to set your own editor options in one go, eg.:

```js
configSet("core", {
  autoHideMenuBar: true,
  openEmptyEditorOnStart: false
});

configSet("editor", {
  fontFamily: "PragmataPro",
  softWrap: true,
  tabType: "soft"
});
```

### Async!

Please keep in mind that `usePackage` runs asynchronously, so that code invoked after `usePackage` calls is not guaranteed to (and almost certainly won't) run after the package is installed and configured.

However, `usePackage` calls are performed in sequence, in invocation order, so that packages can assume previous packages have been fully installed, and code in a `usePackage`'s `init` hook is guaranteed to run after all previous `usePackage`s have fully completed.

## Licence

Copyright 2017 Bodil Stokke

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this program. If not, see
<http://www.gnu.org/licenses/>.
