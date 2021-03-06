/**
 * @fileOverview The instrument object that makes some complex musical gestures. It can contain multiple models, and be modulated in various ways.
 * @module instr
 */

/**
 * Creates a new instance of dtm.instr object. If given a name, it either creates a new instrument with the name, or loads from the pre-registered instrument model collection.
 * @function module:instr.instr
 * @param [arg] {string|dtm.model}
 * @returns {dtm.instr}
 */
dtm.instr = function (arg) {
    var params = {
        name: 'default',
        isPlaying: false,
        poly: false,

        // what is this for?
        modDest: [],

        modList: [],

        sync: true,
        clock: dtm.clock(true, 8),

        instrModel: null,

        callbacks: [],

        defInstr: function defaultInstr(c) {
            var v = params.models.voice;
            var vol = params.models.volume.get('next');
            var dur = params.models.dur.get('next');
            var r = params.models.rhythm.get('next');
            var p = params.models.pitch.get('next');
            var sc = params.models.scale.get();
            var tr = params.models.transp.get('next');
            var ct = params.models.chord.get();
            var div = params.models.subdiv.get('next');
            params.clock.subdiv(div);

            var wt = params.models.wavetable;
            var lpf = params.models.lpf;
            var comb = params.models.comb;
            var delay = params.models.delay;

            if (params.sync === false) {
                params.clock.bpm(params.models.bpm.get('next'));
            }

            params.callbacks.forEach(function (cb) {
                cb(params.clock);
            });

            if (r) {
                ct.forEach(function (val) {
                    if (wt) {
                        v.wt(wt.get());
                    }

                    if (lpf) {
                        v.lpf(lpf.get('next'), params.models.res.get('next'));
                    }

                    if (comb) {
                        v.comb(0.5, params.models.comb.get('next'));
                    }

                    if (delay) {
                        v.delay(params.models.delay.get('next'));
                    }

                    v.dur(dur).decay(dur);
                    v.nn(pq(p + val, sc, params.pqRound) + tr).amp(vol).play();
                });
            }
        }
    };

    var instr = {
        type: 'dtm.instrument',
        //params: {}
        params: []
    };

    /**
     * Returns a parameter of the instrument object.
     * @function module:instr#get
     * @param param {string}
     * @returns {*}
     */
    instr.get = function (param) {
        //return params[key];

        switch (param) {
            case 'name':
                return params.name;

            case 'isplaying':
            case 'isPlaying':
                return params.isPlaying;

            case 'c':
            case 'clock':
                return params.clock;

            case 'beat':
                return params.clock.get('beat');

            case 'm':
            case 'mod':
            case 'model':
            case 'models':
            case 'modList':
                return instr.params;

            case 'param':
            case 'params':
                break;

            default:
                break;
        }
    };

    instr.set = function (dest, src, adapt) {
        if (isNumber(src)) {
            params.models[dest] = dtm.array(src);
        } else {
            if (src.constructor === Array) {
                params.models[dest] = dtm.array(src);
            } else if (isDtmArray(src)) {
                //if (src.get('type') === 'string') {
                //    params.models[dest] = src.clone().classId();
                //} else {
                //}
                params.models[dest] = src.clone();
            } else if (src.type === 'dtm.model') {

            } else if (src.type === 'dtm.synth') {
                params.models[dest] = src;
            }
        }

        switch (dest) {
            case 'bpm':
            case 'tempo':
                break;

            case 'div':
            case 'subdiv':
            case 'subDiv':
                break;

            default:
                break;
        }
        return instr;
    };

    // TODO: implement
    instr.clone = function () {
        return instr;
    };

    /**
     * Sets a model for one of the parameters of the instrument.
     * @function module:instr#model
     * @param model {string|dtm.model|dtm.array}
     * @param [target='none'] {string}
     * @returns {dtm.instr}
     */
    instr.model = function () {
        var arg = arguments[0];
        var categ = 'none'; // TODO: WIP

        if (isString(arguments[1])) {
            categ = arguments[1];
        }

        // TODO: refactor...
        if (arg.constructor === Array) {
            if (categ) {
                params.models[categ] = dtm.array(arg);
            } else {
                params.models['none'] = dtm.array(arg);
            }
        } else if (isObject(arg)) {
            if (arg.type === 'dtm.model') {
                if (arg.get('categ') === 'instr') {
                    // CHECK: ...
                    dtm.log('assigning model "' + arg.params.name + '" to category "' + categ + '"');
                    params.models[categ] = arg;
                    params.modDest.push(arg);
                } else if (arg.get('categ')) {
                    dtm.log('assigning model "' + arg.params.name + '" to category "' + arg.params.categ + '"');
                    params.models[arg.params.categ] = arg;
                    params.modDest.push(arg);
                } else if (categ) {
                    dtm.log('assigning model "' + arg.params.name + '" to category "' + categ + '"');
                    params.models[categ] = arg;
                    params.modDest.push(arg);
                }

            } else if (isDtmArray(src)) {
                params.models[categ] = arg;
            }
        } else if (isString(arg)) {
            var model = _.find(dtm.modelColl, {params: {
                name: arg
            }});

            if (!isEmpty(model)) {
                if (!categ) {
                    categ = model.params.categ;
                }

                dtm.log('assigning model "' + model.params.name + '" to category "' + categ + '"');
                params.models[categ] = model;
                params.modDest.push(model);
            }
        }

        return instr;
    };

    instr.map = function (src, dest) {
        if (isArray(src)) {
            params.models[dest] = dtm.array(src).normalize();
        } else if (isDtmArray(src)) {
            // CHECK: assigning an array here is maybe not so smart...
            params.models[dest] = src.normalize();
        } else if (src.type === 'dtm.model') {

        }
        // use global index from the master

        return instr;
    };

    /**
     * Starts performing the instrument.
     * @function module:instr#play
     * @returns {dtm.instr}
     */
    instr.play = function () {
        // should only play single voice / part / instance
        if (params.isPlaying !== true) {
            params.isPlaying = true;
            dtm.log('playing instr: ' + params.name);

            if (!params.instrModel) {
                //params.clock.add(params.defInstr).start();
                //params.clock.add(params.instrModel.play).start();
            }

            if (params.instrModel) {
                if (params.instrModel.get('categ') === 'instr') {
                    //params.instrModel.stop();
                    //params.instrModel.play();

                    if (params.instrModel.output) {
                        params.clock.add(params.instrModel.output).start();
                    }
                }
            }

            // register to the active instr list?
            dtm.master.activeInstrs.push(instr);
        } else {
            dtm.log('instrument ' + params.name + ' is already playing!');
        }

        return instr;
    };

    instr.stop = function () {
        if (params.isPlaying === true) {
            params.isPlaying = false;
            dtm.log('stopping: ' + params.name);

            if (params.instrModel) {
                if (params.instrModel.params.categ === 'instr') {
                    params.instrModel.stop();
                }
            }

            params.clock.stop();
            params.clock.clear();

            params.callbacks = [];
        }
        return instr;
    };


    // TODO: implement this
    /**
     * Modulates a parameter of the instrument by the index or the name.
     * @function module:instr#mod
     * @param tgt {number|string} Modulation target.
     * @param src {number|string|array|dtm.array} Modulation source.
     * @param [mode='adapt'] {string} Scaling mode.
     * @returns {dtm.instr}
     */
    instr.mod = function (tgt, src, mode) {
        var dest = '';

        if (isString(tgt)) {
            dest = tgt;
        } else if (isNumber(tgt)) {
            // TODO: error check
            dest = instr.params[tgt];
        }

        instr[dest](src, mode);
        // maybe feed arguments[1-];

        return instr;
    };

    instr.modulate = instr.mod;

    function mapper(dest, src) {
        if (isNumber(src)) {
            params.models[dest] = dtm.array(src);
        } else if (isString(src)) {
            params.models[dest] = dtm.array(src).classify();
        } else {
            if (isArray(src)) {
                params.models[dest] = dtm.array(src);
            } else if (isDtmArray(src)) {
                if (src.get('type') === 'string') {
                    params.models[dest] = src.clone().classify();
                } else {
                    params.models[dest] = src.clone();
                }
            } else if (src.type === 'dtm.model') {

            } else if (src.type === 'dtm.synth') {
                params.models[dest] = src;
            }
        }
    }

    //instr.load = function (arg) {
    //    if (typeof(arg) === 'string') {
    //        var model = _.find(dtm.modelColl, {params: {
    //            name: arg,
    //            categ: 'instr'
    //        }});
    //
    //        if (typeof(model) !== 'undefined') {
    //            dtm.log('loading instrument model: ' + arg);
    //            params.instrModel = model;
    //            params.name = arg;
    //            //params.models = model.models;
    //            instr.model(model);
    //            //instr.play = params.instrModel.play;
    //            //instr.run = params.instrModel.run;
    //
    //            // CHECK: not good
    //            params.modDest.push(model);
    //        } else {
    //            dtm.log('registering a new instrument: ' + arg);
    //            params.name = arg;
    //            params.categ = 'instr';
    //            dtm.modelColl.push(instr);
    //        }
    //
    //    } else if (typeof(arg) !== 'undefined') {
    //        if (arg.params.categ === 'instr') {
    //            params.instrModel = arg; // TODO: check the class name
    //            instr.model(arg);
    //        }
    //    }
    //
    //    return instr;
    //};

    instr.load = function (arg) {
        var model;

        if (isString(arg)) {
            //model = _.find(dtm.modelColl, function (m) {
            //    return m.get('name') == arg;
            //});
            model = dtm.modelCallers[arg](); // requires the IIFE to manually return the created model... bad design?
        } else if (arg.type === 'dtm.model') {
            model = arg;
        }

        if (typeof(model) !== 'undefined') {
            model.parent = instr;
            model.assignMethods(instr);

            params.instrModel = model;
        }

        return instr;
    };

    arg = arg || 'default';
    instr.load(arg);
    return instr;
};

dtm.i = dtm.instrument = dtm.instr;