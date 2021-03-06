/**
 * @fileOverview Data object. Extends the dtm.data class, storing a multi-dimensional array.
 * @module loader
 */

/**
 * Creates a new dtm.data (array) object, if the argument is empty, or a promise object, if the argument is a URL.
 * @function module:loader.load
 * @param [input] {string} URL to load or query the data
 * @param fn {function}
 * @returns {dtm.data | promise}
 */
dtm.load = function (input, fn) {
    if (isString(input)) {
        var url = input;

        return new Promise(function (resolve) {
            var ext = url.split('.').pop(); // checks the extension

            if (ext === 'jsonp') {
                var cbName = 'jsonp_callback_' + Math.round(100000 * Math.random());
                window[cbName] = function (res) {
                    delete window[cbName];
                    document.body.removeChild(script);

                    var keys = Object.keys(res);

                    keys.forEach(function (val) {
                        // CHECK: this is a little too case specific
                        if (val !== 'response') {
                            params.coll = res[val];
                            params.keys = Object.keys(params.coll[0]);
                            setArrays();
                            setTypes();
                            setSize();

                            resolve(data);
                        }
                    });

                    if (typeof(cb) !== 'undefined') {
                        cb(data);
                    }
                };

                var script = document.createElement('script');
                script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + cbName;
                document.body.appendChild(script);

            } else {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                //xhr.withCredentials = 'true';

                switch (ext) {
                    case 'txt':
                    case 'csv':
                        break;
                    case 'json':
                        //xhr.responseType = 'json';
                        break;
                    case 'wav':
                    case 'aif':
                    case 'aiff':
                    case 'ogg':
                    case 'mp3':
                        xhr.responseType = 'arraybuffer';
                        break;
                    case 'png':
                    case 'jpg':
                    case 'jpeg':
                        xhr.responseType = 'blob';
                        break;
                    default:
                        //xhr.responseType = 'blob';
                        break;
                }

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && xhr.status === 200) {

                        // for audio sample
                        if (xhr.responseType === 'arraybuffer') {

                            if (dtm.wa.isOn) {
                                dtm.wa.actx.decodeAudioData(xhr.response, function (buf) {
                                    var data = dtm.data();
                                    var arrays = [];
                                    for (var c = 0; c < buf.numberOfChannels; c++) {
                                        var floatArr = buf.getChannelData(c);
                                        arrays.push(dtm.data(Array.prototype.slice.call(floatArr)).label('ch_' + c).parent(data));
                                    }

                                    if (!isEmpty(fn)) {
                                        fn(data.set(arrays));
                                    }

                                    resolve(data.set(arrays));
                                });
                            }
                        } else if (xhr.responseType === 'blob') {
                            var img = new Image();
                            img.onload = function () {
                                var canvas = document.createElement('canvas');
                                canvas.width = img.width;
                                canvas.height = img.height;

                                var context = canvas.getContext('2d');
                                context.drawImage(img, 0, 0);

                                var res = [];

                                var imageData = context.getImageData(0, 0, img.width, img.height).data;
                                for (var c = 0; c < img.width; c++) {
                                    res.push(imageData.filter(function (v, i) {
                                        return i % (img.width*4) === c;
                                    }));
                                }
                                console.log(res);
                            };
                            img.src = window.URL.createObjectURL(xhr.response);

                        } else {
                            var keys = [];

                            if (ext === 'csv') {
                                var data = dtm.data();
                                var arrays = [];
                                objForEach(dtm.parser.csvToCols(xhr.response), function (v, k) {
                                    var a = dtm.data(v).label(k).parent(data);
                                    arrays.push(a);
                                });

                            } else if (ext === 'json') {
                                var res = xhr.responseText;

                                try {
                                    res = JSON.parse(res);
                                } catch (e) {
                                    try {
                                        res = eval(res);
                                    } catch (e) {
                                        console.log('Could not parse the JSON file. Maybe the format is not right.');
                                    }
                                }


                                if (url.indexOf('wunderground') > -1) {
                                    var obj = JSON.parse(xhr.response);
                                    params.coll = obj[Object.keys(obj)[1]];

                                    if (params.coll.constructor === Array) {
                                        // for hourly forecast
                                        keys = Object.keys(params.coll[0]);
                                    } else {
                                        // for current weather
                                        keys = Object.keys(params.coll);
                                        params.coll = [params.coll];
                                    }
                                } else {
                                    var second = res[Object.keys(res)[0]];

                                    if (second.constructor === Array) {
                                        keys = Object.keys(second[0]);
                                    } else {
                                        keys = Object.keys(second);
                                    }

                                    // TODO: may not work with non-array JSON formats
                                    params.coll = res;
                                }
                            } else {
                                // TODO: this only works for shodan
                                //params.coll = JSON.parse(xhr.response)['matches'];

                                params.coll = second;
                            }

                            if (!isEmpty(fn)) {
                                fn(data.set(arrays));
                            }

                            resolve(data.set(arrays));
                        }
                    }
                };

                xhr.send();
            }
        });
    } else {
        var elem_file = input;
        var fileType = null;
        var reader = new FileReader();
        if (elem_file[0].name.match(/.+\.json/gi)) {
            fileType = 'json';
        } else if (elem_file.name.match(/.+\.csv/gi)) {
            fileType = 'csv';
        }
        reader.readAsText(elem_file);
        return new Promise(function (resolve) {
            reader.onload = function (e) {
                if (fileType === 'json') {
                    resolve(JSON.parse(e.target.result));
                } else if (fileType === 'csv') {
                    //resolve(dtm.parser.csvToCols(e.target.result));
                    var data = dtm.data();
                    var arrays = [];
                    objForEach(dtm.parser.csvToCols(e.target.result), function (v, k) {
                        var a = dtm.data(v).label(k).parent(data);
                        arrays.push(a);
                    });

                    if (!isEmpty(fn)) {
                        fn(data.set(arrays));
                    }

                    resolve(data.set(arrays));
                }
            };
        });
    }
};

// does not support multiple files in the input element
dtm.file = function (file, fn) {
    var fileType = null;
    var reader = new FileReader();
    if (file.name.match(/.+\.json/gi)) {
        fileType = 'json';
    } else if (file.name.match(/.+\.csv/gi)) {
        fileType = 'csv';
    }
    reader.readAsText(file);
    return new Promise(function (resolve) {
        reader.onload = function (e) {
            if (fileType === 'json') {
                resolve(JSON.parse(e.target.result));
            } else if (fileType === 'csv') {
                //resolve(dtm.parser.csvToCols(e.target.result));
                var data = dtm.data();
                var arrays = [];
                objForEach(dtm.parser.csvToCols(e.target.result), function (v, k) {
                    var a = dtm.data(v).label(k).parent(data);
                    arrays.push(a);
                });

                if (!isEmpty(fn)) {
                    fn(data.set(arrays));
                }

                resolve(data.set(arrays));
            }
        };
    });
};

/**
 * @function module:loader.csv
 * @param input
 * @param fn
 */
dtm.csv = function (input, fn) {
    if (isString(input)) {
        if (isURL(input, '.csv')) {
            // is URL
            var p = new Promise(function (resolve) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', input, true);

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        var data = dtm.data();
                        var arrays = [];
                        objForEach(dtm.parser.csvToCols(xhr.response), function (v, k) {
                            var a = dtm.data(v).label(k).parent(data);
                            arrays.push(a);
                        });

                        if (!isEmpty(fn)) {
                            fn(data.set(arrays));
                        }

                        // resolve(data.set(arrays));
                        resolve(arrays);
                    }
                };

                xhr.send();
            });

            var data = dtm.data();
            p.then(function (d) {
                data.set(d);
            });

            return data;
        } else {
            // is CSV as text

        }
    } else if (isFile(input)) {
        loadFileObject(input, function (str) {
            var data = dtm.data();
            var arrays = [];
            objForEach(dtm.parser.csvToCols(str), function (v, k) {
                var a = dtm.data(v).label(k).parent(data);
                arrays.push(a);
            });

            if (!isEmpty(fn)) {
                fn(data.set(arrays));
            }

            // resolve(data.set(arrays));
            // resolve(arrays);
        });
    }
};

dtm.json = function (input, fn) {
    if (isString(input)) {
        if (isURL(input, '.json')) {

        } else {

        }
    } else if (isFile(input)) {

    }
};

/**
 * @function module:loader.text | txt
 * @param input
 * @param fn
 */
dtm.text = function (input, fn) {
    if (isString(input)) {
        if (isURL(input, '.txt')) {
            var p = new Promise(function (resolve) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', input, true);

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        var data = dtm.data();
                        if (isString(xhr.response)) {
                            data.set(xhr.response);
                        } else {
                            throw(new TypeError('the file content is not text'));
                        }

                        if (!isEmpty(fn)) {
                            fn(data);
                        }

                        // resolve(data);
                        resolve(xhr.response);
                    }
                };

                xhr.send();
            });

            var data = dtm.data();
            p.then(function (res) {
                p = data.set(res);
            });
            return data;

        } else {

        }
    } else if (isFile(input)) {
        loadFileObject(input, function (str) {
            var data = dtm.data();
            if (isString(str)) {
                data.set(str);
            }

            if (!isEmpty(fn)) {
                fn(data);
            }
        });
    }
};

dtm.txt = dtm.text;

/**
 * @function module:loader.web
 * @param url
 * @param fn
 */
dtm.web = function (url, fn) {
    return new Promise(function (resolve) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var data = dtm.data();

                if (url.indexOf('wunderground') > -1) {
                    var obj = JSON.parse(xhr.response);

                    // hard coding...
                    data.label('hourly_forecast');
                    var coll = obj['hourly_forecast'];
                    var keys = Object.keys(coll[0]);

                    function mapObjArray(objArray) {
                        var keys = Object.keys(objArray[0]);
                        var res = keys.map(function (k) {
                            var temp = objArray.map(function (doc) {
                                return doc[k];
                            });

                            var resArray = dtm.data(temp).label(k);

                            if (isParsableNumArray(temp)) {
                                resArray.tonum();
                            }
                            return resArray;
                        });
                        return dtm.data(res);
                    }

                    var res = [];

                    keys.forEach(function (k) {
                        var temp = coll.map(function (doc) {
                            return doc[k];
                        });

                        if (isObjArray(temp)) {
                            temp = mapObjArray(temp);
                        }

                        var resArray = dtm.data(temp).label(k).parent(data);
                        if (isParsableNumArray(temp)) {
                            resArray.tonum();
                        }

                        res.push(resArray);
                    });
                } else {
                    // TODO: this only works for shodan
                    var coll = JSON.parse(xhr.response)['matches'];


                    // params.coll = JSON.parse(xhr.response)['matches'];
                    // params.coll = second;

                    //var second = res[Object.keys(res)[0]];
                    //
                    //if (second.constructor === Array) {
                    //    keys = Object.keys(second[0]);
                    //} else {
                    //    keys = Object.keys(second);
                    //}
                    //
                    //// TODO: may not work with non-array JSON formats
                    //params.coll = res;
                }

                if (!isEmpty(fn)) {
                    fn(data.set(res));
                }

                resolve(data.set(res));
            } else {
            }
        };

        xhr.send();
    });
};

/**
 * @function module:loader.image | img | pic
 * @param input
 * @param fn
 * @param mode
 */
dtm.image = function (input, fn, mode) {
    if (isString(input)) {
        var url = input;

        if (!isString(mode)) {
            mode = 'brightness';
        }

        return new Promise(function (resolve) {
            var img = new Image();
            var data = dtm.data();

            // set image to data
            img.onload = function () {
                var canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                var context = canvas.getContext('2d');
                context.drawImage(img, 0, 0);

                var imageData = context.getImageData(0, 0, img.width, img.height).data;

                if (mode === 'brightness') {
                    var bri = new Float32Array(imageData.length/4);

                    for (var i = 0; i < imageData.length; i += 4) {
                        var brightness = 0.34 * imageData[i] + 0.5 * imageData[i+1] + 0.16 * imageData[i+2];
                        bri[i/4] = brightness/255;
                    }
                    data.set(bri).block(img.width).label('brightness');
                } else if (mode === 'hue') {
                    var hue = new Float32Array(imageData.length/4);
                    var r, g, b, h;
                    var max, min;

                    for (var i = 0; i < imageData.length; i += 4) {
                        r = imageData[i]/255;
                        g = imageData[i+1]/255;
                        b = imageData[i+2]/255;

                        max = Math.max(r, g, b);
                        min = Math.min(r, g, b);

                        if (max === r) {
                            h = (g - b) / (max - min);
                        } else if (max === g) {
                            h = 2 + (b - r) / (max - min);
                        } else {
                            h = 4 + (r - g) / (max - min);
                        }

                        h *= 60;

                        if (h < 0) {
                            h += 360;
                        }

                        hue[i/4] = h;
                    }

                    data.set(hue).block(img.width).label('hue');
                } else if (mode === 'heatmap') {
                    var hue = new Float32Array(imageData.length/4);
                    var r, g, b, h;
                    var max, min;

                    for (var i = 0; i < imageData.length; i += 4) {
                        r = imageData[i]/255;
                        g = imageData[i+1]/255;
                        b = imageData[i+2]/255;

                        max = Math.max(r, g, b);
                        min = Math.min(r, g, b);

                        if (max === r) {
                            h = (g - b) / (max - min);
                        } else if (max === g) {
                            h = 2 + (b - r) / (max - min);
                        } else {
                            h = 4 + (r - g) / (max - min);
                        }

                        h *= 60;

                        if (h < -30) {
                            h += 360;
                        }

                        if (h < 0) {
                            h = 0;
                        }

                        if (h > 300) {
                            h = 300;
                        }

                        if (r+g+b < 0.15) {
                            h = 300;
                        }

                        if (isNaN(h)) {
                            h = 0;
                        }

                        hue[i/4] = 1 - (h / 300);
                    }

                    data.set(hue).block(img.width).label('hue');
                } else if (mode === 'rgb') {
                    var red = new Float32Array(imageData.length/4);
                    var green = new Float32Array(imageData.length/4);
                    var blue = new Float32Array(imageData.length/4);

                    for (var i = 0; i < imageData.length; i += 4) {
                        red[i/4] = imageData[i]/255;
                        green[i/4] = imageData[i+1]/255;
                        blue[i/4] = imageData[i+2]/255;
                    }
                    data.set(red).block(img.width).label('red');
                }

                if (!isEmpty(fn)) {
                    fn(data);
                }

                resolve(data);
            };

            if (isURL(input)) {
                var xhr = new XMLHttpRequest();
                xhr.responseType = 'blob';
                xhr.open('GET', url, true);

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && xhr.status === 200) {

                        img.src = window.URL.createObjectURL(xhr.response);
                    }
                };

                xhr.send();
            } else if (isDataURL(input)) {
                img.src = input;
            }
        });
    } else if (isFile(input)) {
        loadFileObject(input, function (dataURL) {
            dtm.image(dataURL, fn, mode);
        });
    }
};

dtm.pic = dtm.img = dtm.image;

/**
 * @function module:loader.cam
 * @param input
 * @param interval
 */
dtm.cam = function (input, interval) {
    var w = 400;
    var h = 300;

    var data, fn;

    if (isDtmArray(input)) {
        data = input;
    } else if (isFunction(input)) {
        fn = input;
    }
    if (isEmpty(data)) {
        data = dtm.data(0);
    }

    if (!isNumber(interval) || interval < 0) {
        interval = 1;
    }

    navigator.getUserMedia = (navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

    if (navigator.getUserMedia) {
        navigator.getUserMedia({
                audio: false,
                video: {
                    width: w,
                    height: h
                }
            },
            function (stream) {
                var video;
                if (document.getElementById('cam')) {
                    video = document.getElementById('cam');
                } else {
                    video = document.createElement('video');
                }
                video.src = (window.URL && window.URL.createObjectURL(stream)) || stream;

                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;

                var context = canvas.getContext('2d');
                context.fillRect(0, 0, w, h);

                video.onloadedmetadata = function (e) {
                    video.play();
                    video.muted = 'true';
                };

                dtm.music(function () {
                    context.drawImage(video, 0, 0, w, h);
                    var imageData = context.getImageData(0, 0, w, h).data;

                    var res = new Float32Array(imageData.length/4);

                    for (var i = 0; i < imageData.length; i += 4) {
                        var brightness = 0.34 * imageData[i] + 0.5 * imageData[i+1] + 0.16 * imageData[i+2];
                        // // red
                        // imageData[i] = brightness;
                        // // green
                        // imageData[i+1] = brightness;
                        // // blue
                        // imageData[i+2] = brightness;

                        res[i/4] = brightness/255;
                    }
                    data.set(res).block(w);

                    if (!isEmpty(fn)) {
                        fn(data);
                    }

                }).interval(interval).run();
            },
            function (err) {
                console.log(err);
            }
        );
    } else {
        console.log('getUserMedia not supported');
    }
};

/**
 * @function module:loader.audio
 * @param grab
 * @param block
 */
dtm.audio = function (grab, block) {
    if (isNumber(grab)) {
        block = grab;
    } else if (!isNumber(block)) {
        block = 1024;
    }

    var data = dtm.data(0);
    dtm.params.stream = true;

    navigator.getUserMedia = (navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

    if (navigator.getUserMedia) {
        navigator.getUserMedia({
                audio: {
                    mandatory: {
                        googEchoCancellation: 'false',
                        googAutoGainControl: 'false',
                        googNoiseSuppression: 'false',
                        googHighpassFilter: 'false'
                    },
                    optional: []
                },
                video: false
            },
            function (stream) {
                // data = dtm.data();

                var actx = dtm.wa.actx;
                var input = actx.createMediaStreamSource(stream);
                var sp = actx.createScriptProcessor(block,1,1);

                // TODO: not getting destoryed properly
                sp.onaudioprocess = function (event) {
                    if (dtm.params.stream) {
                        var samps = event.inputBuffer.getChannelData(0);

                        if (isDtmArray(grab)) {
                            grab.set(samps);
                        } else if (isFunction(grab)) {
                            grab(data.set(samps));
                        } else {
                            data.set(samps); // not working
                        }
                    }
                };

                var gain = actx.createGain();
                gain.gain.setValueAtTime(0, 0);

                input.connect(sp).connect(gain).connect(actx.destination);

                dtm.cache.audioStream.push({
                    audio: null,
                    input: input,
                    sp: sp,
                    gain: gain
                });
            },
            function (e) {
                console.error(e);
            });
    }

    return data;
};

dtm.stream = function (URL, grab, block) {
    if (isNumber(grab)) {
        block = grab;
    } else if (!isNumber(block)) {
        block = 1024;
    }

    var data = dtm.data(0);
    dtm.params.stream = true;

    var actx = dtm.wa.actx;
    var audio = document.createElement('audio');
    audio.src = URL;
    audio.crossOrigin = 'anonymous';
    audio.play();
    var input = actx.createMediaElementSource(audio);
    var sp = actx.createScriptProcessor(block,1,1);

    // TODO: not getting destoryed properly
    sp.onaudioprocess = function (event) {
        if (dtm.params.stream) {
            var samps = event.inputBuffer.getChannelData(0);

            if (isDtmArray(grab)) {
                grab.set(samps);
            } else if (isFunction(grab)) {
                grab(data.set(samps));
            } else {
                data.set(samps); // not working
            }
        }
    };

    var gain = actx.createGain();
    gain.gain.setValueAtTime(1, 0);

    input.connect(sp).connect(gain).connect(actx.destination);

    dtm.cache.audioStream.push({
        audio: audio,
        input: input,
        sp: sp,
        gain: gain
    });
};

/**
 * @function module:loader.wav
 * @param input
 * @param fn
 */
dtm.wav = function (input, fn) {
    if (isString(input)) {
        if (isURL(input)) {
            return new Promise(function (resolve) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', input, true);

                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4 && xhr.status === 200) {
                        if (dtm.wa.isOn) {
                            dtm.wa.actx.decodeAudioData(xhr.response, function (buf) {
                                var data = dtm.data();
                                var arrays = [];
                                for (var c = 0; c < buf.numberOfChannels; c++) {
                                    var floatArr = buf.getChannelData(c);
                                    arrays.push(dtm.data(Array.prototype.slice.call(floatArr)).label('ch_' + c).parent(data));
                                }

                                if (!isEmpty(fn)) {
                                    fn(data.set(arrays));
                                }

                                resolve(data.set(arrays));
                            });
                        }
                    }
                }
            });
        }
    } else if (isFile(input)) {
        loadFileObject(input, function (arrayBuffer) {
            if (dtm.wa.isOn) {
                dtm.wa.actx.decodeAudioData(arrayBuffer, function (buf) {
                    var data = dtm.data();
                    var arrays = [];
                    for (var c = 0; c < buf.numberOfChannels; c++) {
                        var floatArr = buf.getChannelData(c);
                        arrays.push(dtm.data(Array.prototype.slice.call(floatArr)).label('ch_' + c).parent(data));
                    }

                    if (!isEmpty(fn)) {
                        fn(data.set(arrays));
                    }

                    // resolve(data.set(arrays));
                });
            }
        });
    }
};