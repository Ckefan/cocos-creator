(function (global) {
    var PubSub = {};
    PubSub._storage = {};
    PubSub.subscribe = function (type, module, handler) {
        if (PubSub._storage[type] == null) {
            PubSub._storage[type] = {};
        }
        if (PubSub._storage[type][module] == null) {
            PubSub._storage[type][module] = [];
        }
        PubSub._storage[type][module].push(handler);
    };
    PubSub.unsubscribe = function (type, module, handler) {
        if (type == null) {
            if (module == null) {
                throw new Error('error');
            }

            if (module != null) {
                for (let key_type in PubSub._storage) {
                    if (PubSub._storage.hasOwnProperty(key_type)) {
                        delete PubSub._storage[key_type][module];
                    }
                }
            }
        }
        else {
            if (module == null) {
                delete PubSub._storage[type];
            }
            if (module != null && handler == null) {
                delete PubSub._storage[type][module];
            }
            if (module != null && handler != null) {
                let j = 0;
                let functions = PubSub._storage[type][module];

                for (; j < functions.length; j++) {
                    let index = PubSub._storage[type][module].indexOf(functions[j]);
                    PubSub._storage[type][module].splice(index, 1);
                }
            }
        }
    };
    PubSub.publish = function () {
        var type = arguments[0];
        for (var module in PubSub._storage[type]) {
            if (PubSub._storage[type].hasOwnProperty(module)) {
                var functions = PubSub._storage[type][module];

                for (var i = 0; i < functions.length; i++) {
                    functions[i](...Array.prototype.slice.call(arguments, 1));
                }
            }
        }
    };
    module.exports = PubSub;
}(this));