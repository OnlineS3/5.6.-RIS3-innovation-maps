let init = true;
let heatmap_title='Heatmap', bubble_title='Geo-scatter', colorbar_title='Distribution';
let tmp_r, records = [['','','','','']];
let tmp_h, headers = ['Project Identifier', 'Region(s)', 'Funding', 'OECD', 'NABS'];
let nuts = 3, rIdx = 1, fIdx = 2, bIdx = 3, tIdx = 4;
let x, y, z, dist, zLab, regions, business, technology, regionLab, regionLat, regionLon, filtered = [];
let hideIcons = ['sendDataToCloud', 'hoverClosestCartesian', 'hoverCompareCartesian'];
let options = { headers: true, separator: ';', quote: '"' };

let values;

$(document).ready(function() {
    values = [
        {"pos": 0,   "color":'#ffffff'},
        {"pos": 100, "color":'#2e64aa'}
    ];
    initColorscale();
    renderGradient();
    $('.ui-slider').on('dblclick', (e)=>{
        addNewHandle((e.offsetX/$('.ui-slider').width())*100);
    });

    tutorial();
    $('[data-toggle="tooltip"]').tooltip();

    $(window).on('resize', function() {
        var height = $(this).height();
        $('#sources, #data').css('min-height', height);
    }).resize();

    // Load NUTS Level 1, 2 and 3 Regional Data
    $.getJSON('/static/data/regions.json', (json) => {
        regions = json["levels"];
        $('#nuts').on('change', function() {
            nuts = parseInt(this.value);
            regionLab = unpack(regions[nuts], 'id');
            regionLat = unpack(regions[nuts], 'lat');
            regionLon = unpack(regions[nuts], 'lon');
            plot();
        }).change();
    });
    // Load OECD and NABS Classification Standards
    $.when(
        $.getJSON('/static/data/OECD.json', (json) => {
            business = json;
            x = unpack(  business, 'id');
        }),
        $.getJSON('/static/data/NABS.json', (json) => {
            technology = json;
            y = unpack(technology, 'id');
        })
    ).then(function() {
        zLab = matrix(x.length, y.length, "");
        loadSheet();
        $('#settings').on('change', 'input, select', function() {
            var ids = $('#codes').is(':checked');
            var lan = $('#lang').val();
            $('#spreadsheet').jexcel('updateSettings', {
                cells: function (cell, col, row) {
                    switch(parseInt(col)) {
                    case rIdx:
                        $(cell).html($.csv.fromArrays([$.csv.toArray($(cell).html()).map(val => {
                            var region = regions[nuts].find(i => (i.id === val)||(i.name === val)||(i.en === val));
                            if(region)
                                if(ids) return region.id;
                                else
                                    if(lan=="en")
                                        return region.en;
                                    else
                                        return region.name;
                            else        return val;
                        })]).toString()); break;
                    case bIdx:
                        $(cell).html($.csv.fromArrays([$.csv.toArray($(cell).html()).map(val=> {
                            var b = business.find(i => (i.id === val) || (i.name === val));
                            if (b)
                                if(ids) return b.id;
                                else    return b.name;
                            else        return val;
                        })]).toString());
                        break;
                    case tIdx:
                        $(cell).html($.csv.fromArrays([$.csv.toArray($(cell).html()).map(val => {
                            var t = technology.find(i => (i.id === val)||(i.name === val));
                            if(t)
                                if(ids) return t.id;
                                else    return t.name;
                            else        return val;
                        })]).toString());
                    }
                }
            });
        });
        $('#scale').on('change', function() {
            var s =  (this.value < 0) ? (1 - Math.abs(this.value * .1)).toFixed(1) : (this.value == 0) ? 1 : this.value;
            $('#output').prop("innerHTML", s + '×');
            Plotly.restyle('graph', {
                marker: {
                    size: dist.map(d => d*s),
                    color: z,
                    line:{
                        color: 'black',
                        width: 1
                    },
                    showscale: true,
                    colorscale: getColorscale(),
                    colorbar: {
                        title: colorbar_title
                    }
                }
            });
        });
        $('#design').on('hidden.bs.modal', function(){$('div[id^="opt_"]').hide()});
    });

    $('input[name="type"]').on('change', plot);
    $('input[name="bubble"]').on('change', plot);
    $('#area').on('change', function(){
        var opt = $(this).val();
        if(opt=='NABS'||opt=='OECD')
            render_comp($(this).val());
        else
            Plotly.purge('comp');
    });

    $('#region').select2({ ajax: { url: '/filter', data: (term) => { return { file: 'regions' + $('#level').val() + '.json', q: term, p: true } }, processResults: process } });
    $('#nabs_i').select2({ ajax: { url: '/filter', data: (term) => { return { file: 'NABS.json', q: term } }, processResults: process } });
    $('#oecd_i').select2({ ajax: { url: '/filter', data: (term) => { return { file: 'OECD.json', q: term } }, processResults: process } });

    $('#per_page').on('change', init_pagination(filtered));

    $('#timeline, #menu').affix({offset: {top: 263}});

    $('body').scrollspy({target: ".stepwizard"});
    $(".stepwizard a").on('click', function(e) {
        if (this.hash !== "") {
            e.preventDefault();
            scrollTo(this.hash);
        }
    });
    $('#up').on('click', function(){$('.stepwizard-step.active').prev().children(':first').click()});
    $('#down').on('click', function(){$('.stepwizard-step.active').next().children(':first').click()});
});

function initColorscale() {
    values = _.sortBy(values, "pos");
    var cols = unpack(values, "color");
    if($('#slider').hasClass("ui-slider")) $("#slider").slider("destroy");
    $("#slider").slider({
            min: 0, max: 100,
            values: unpack(values, "pos"),
            slide: (event, ui)=>{
                if(event.originalEvent.type !== 'mousemove') return false;
                values[ui.handleIndex].pos = ui.value;
                renderGradient();
            },
            stop: plot
        });
    $('.ui-slider-handle').each(function(idx){
        $(this).append('<div class="colorHandle" data-toggle="tooltip" title="' + idx + '"><br><input type="color" style="background:' + cols[idx] + '" value="' + cols[idx] + '" onchange="values[' + idx + '].color = this.value; this.style.background = this.value; renderGradient(); plot();">' + ((idx > 0 && idx < values.length-1) ? '<button class="btn btn-default" onclick="values.splice(' + idx + ', 1); initColorscale();">&times;</button></div>' : '</div>'));
        $('[data-toggle="tooltip"]').tooltip();
    });
}
function getColorscale(){
    return $('.ui-slider-handle').map((idx, ele) => [[parseInt($(ele)[0].style.left.slice(0,-1))/100, $(ele).find('input').val()]]).get();
}
function getColor(factor) {
    var c1=values[0], c2=values[values.length-1];
    $.each(values, (idx, value) => {
        if(value.pos < factor) c1 = value;
        if(value.pos > factor){c2 = value; return false;}
    });
    var sf = (factor-c1.pos)/(c2.pos-c1.pos);
    return interpolateColor(c1.color, c2.color, sf);
}

function renderGradient() {
    values = _.sortBy(values, "pos");
    $("#slider").css("background", 'linear-gradient(to right, ' + $('.ui-slider-handle').map((idx, ele) => $(ele).find('input').val() + " " + $(ele)[0].style.left).get().join() + ')');
}
function addNewHandle(factor) {
    var c1=values[0], c2=values[values.length-1];
    $.each(values, (idx, value) => {
        if(value.pos < factor) c1 = value;
        if(value.pos > factor){c2 = value; return false;}
    });
    var sf = (factor-c1.pos)/(c2.pos-c1.pos);
    values.push({'pos': factor, 'color': interpolateColor(c1.color, c2.color, sf)});
    initColorscale();
}

// Read Users File
function loadFile(e) {
    let file = e.target.files[0];
    if (!file) return;
    $('#file').val(file.name);

    parseFile(e);

    $('#import').on('change', function() {
       options.separator = $('#separator').val();
       options.quote =     $('#quote').val();
       options.headers =   $('#headers').is(':checked');
       parseFile(e);
    });

    $('.import').on('click', function() {
        // Process "Region(s)" column selection
        rIdx = $('#col_r').val();
        if(rIdx==-1) {
            tmp_h.push('Region(s)');
            tmp_r.forEach(r=>r.push(''));
            rIdx = tmp_h.length;
        } else {
            tmp_h[rIdx] = "Region(s)";
        }

        // Process "Funding Amount" column selection
        fIdx = $('#col_f').val();
        if(fIdx==-1) {
            tmp_h.push("Funding");
            tmp_r.forEach(r=>r.push(''));
            fIdx = tmp_h.length;
        } else {
            tmp_h[fIdx] = "Funding";
        }

        // Process "OECD" column selection
        bIdx = $('#col_b').val();
        if(bIdx==-1) {
            tmp_h.push("OECD");
            tmp_r.forEach(r=>r.push(''));
            bIdx = tmp_h.length;
        } else {
            tmp_h[bIdx] = "OECD";
        }

        // Process "NABS" column selection
        tIdx = $('#col_t').val();
        if(tIdx==-1) {
            tmp_h.push("NABS");
            tmp_r.forEach(r=>r.push(''));
            tIdx = tmp_h.length;
        } else {
            tmp_h[tIdx] = "NABS";
        }

        if($(this).attr("id")=="#append") {
            headers = [...new Set([...headers, ...tmp_h])];
            data = records.map(a => headers.reduce((r,k,i) => Object.assign(r, {[k]: a[i]}), {})).concat(CSVToJSON(tmp_h, tmp_r));
        } else {
            headers = tmp_h;
            data = CSVToJSON(tmp_h, tmp_r);
        }
        records = [];
        //Process Records
        headers.forEach((header,idx) => {
            switch(header) {
                case "Region(s)": rIdx=idx; break;
                case "Funding":   fIdx=idx; break;
                case "OECD":      bIdx=idx; break;
                case "NABS":      tIdx=idx;
            }
        });
        data.forEach(object => { var o = []; for(var key of headers) key in object ? o.push(object[key]) : o.push(''); records.push(o); });
        //Init
        loadSheet();
    });

    $('.step_2').show();
    $('#confirm').removeAttr('disabled');
    $('.modal-dialog').addClass('modal-lg');
}

function parseFile(e) {
    alasql('SELECT * FROM FILE(?, {headers:' + options.headers + ',separator:"\\' + options.separator + '",quote:"\\' + options.quote + '"})', [e], function (data) {
        tmp_h = Object.keys(data[0]);
        tmp_r = JSONToCSV(data);

        preview(tmp_h, tmp_r);

        $('select[id^="col_"]').empty().append(new Option('Append New Column', -1));
        tmp_h.forEach((h,idx) => $('select[id^="col_"]').append(new Option(h, idx)));
    });
}

function getData() {
    $.ajax({
        url:  '/getData/',
        data: {
            'csrfmiddlewaretoken': csrf_token,
            'Region': $('#region').val(), 'OECD': $('#oecd_i').val(), 'NABS': $('#nabs_i').val()
        },
        success: function(data) {
            if(records.slice(-1)[0].every(r=>r=='')) records.pop();
            JSON.parse(data).forEach(function(object) { var o = []; for(var key of headers) key in object ? o.push(object[key]) : o.push(''); records.push(o); });
            loadSheet();
        }
    });
}

function preview(headers, data) {
    $('#preview').jexcel({
        colHeaders: headers,
        colWidths: Array(headers.length).fill(140),
        data: data.slice(0, $('#per_page').val())
    });
}

function init_pagination(data) {
    $('#p').empty();
    var n = parseInt($('#per_page').val());
    var p = 0;
    for (var i=0; i<=data.length; i+=n) {
        $('#p').append(new Option(p+1, p));
        p++;
    }
    $('#p').val(0);
}
function paginate(data) {
    var n = parseInt($('#per_page').val());
    $('#left, #right').attr('disabled', true);
    if (data.length > n) {
        var p = parseInt($('#p').val());
        var s = p*n;
        if(s > 0)
            $('#left').attr('disabled', false);
        var e = Math.min(s+n, data.length);
        if(e < data.length)
            $('#right').attr('disabled', false);
        return data.slice(s, e);
    } else {
        return data;
    }
}
function changePage() {
    $('#spreadsheet').jexcel('setData', paginate(filtered), false);
}

function loadSheet() {
    filtered = filterData();
    init_pagination(filtered);

    let protectedCols = Array.apply(null, new Array(headers.length)).map((e,idx) => !(idx==rIdx || idx==fIdx || idx==bIdx || idx==tIdx));

    //Specify column types
    $('#spreadsheet').jexcel({
        colHeaders: headers,
        columns: headers.map(function (val, idx) {
            switch(idx){
                case rIdx: return {type: 'text', editor: select2Editor};
                case bIdx: return {type: 'text', editor: select2Editor};
                case tIdx: return {type: 'text', editor: select2Editor};
                default:   return {type: 'text'};
            }
        }),
        colWidths: Array(headers.length).fill(140),
        data: paginate(filtered),
        allowDeleteColumn: protectedCols,
        about: "5.6. - RIS3 Innovation Maps",
        onchange: sheetChange
    });

    setTimeout(plot, 10);
    $('#settings').change();
    initFilters();

    if(!init) scrollTo('#data');
    else      init=false;

    $('input[id^="i_"]').each((idx,i)=> $(i).val()!="" ? $('#col-'+idx+' span').addClass('fa fa-filter') : null);
}

function sheetChange(obj, cell, val) {
    var idx = $(cell).attr("id").split("-");
    idx[1] = parseInt(idx[1]) + getStartIdx();
    records[idx[1]][idx[0]] = val;
    plot();
}

function getStartIdx(){
   return parseInt($('#p').val()) * parseInt($('#per_page').val());
}

function save() {
    $('#spreadsheet').jexcel('download');
}
function saveGraph() {
    Plotly.downloadImage(document.getElementById('graph'), {filename: $('#filename').val(), format: $('#format').val(), height: parseInt($('input[name="height"]').val()), width: parseInt($('input[name="width"]').val())});
}

function validate() {
    var valid_sheet = true;

    $('#spreadsheet').jexcel('updateSettings', {
        cells: (cell, col) => {
            var valid = [ true ];
            switch (parseInt(col)) {
                case rIdx: valid = $.csv.toArray($(cell).html()).map(val => {
                    val = val.substring(0, nuts + 2);
                    return regions[nuts].findIndex(i => (i.id === val)||(i.name === val)||(i.en === val)) > -1;
                }); break;
                case bIdx: valid = $.csv.toArray($(cell).html()).map(val =>      business.findIndex(i => (i.id === val)||(i.name === val)) > -1);                 break;
                case tIdx: valid = $.csv.toArray($(cell).html()).map(val =>    technology.findIndex(i => (i.id === val)||(i.name === val)) > -1);
            }
            valid = valid.reduce((a,v) => a && v);
            if(valid) $(cell).removeClass("err");
            else      $(cell).addClass("err");
        }
    });

    var invalid = [];
    records.forEach((rec, idx) => {
        var valid_rec = $.csv.toArray(rec[rIdx]).map(val => { val = val.substring(0, nuts + 2); return regions[nuts].findIndex(i => (i.id === val)||(i.name === val)||(i.en === val)) > -1; }).every(val => val);
        valid_rec &= $.csv.toArray(rec[bIdx]).map(val =>   business.findIndex(i => (i.id === val)||(i.name === val)) > -1).every(val => val);
        valid_rec &= $.csv.toArray(rec[tIdx]).map(val => technology.findIndex(i => (i.id === val)||(i.name === val)) > -1).every(val => val);
        if(!valid_rec) invalid.push(idx + 1);
        valid_sheet &= valid_rec;
    });

    var tooltip= invalid.length > 0 ? 'Invalid Rows: ' + invalid : 'Valid';
    $('#valid').attr('data-original-title', tooltip).parent().find('.tooltip-inner').html(tooltip);

    if(valid_sheet) $('#valid').removeClass().addClass('fa fa-check text-success');
    else            $('#valid').removeClass().addClass('fa fa-times text-danger');
}

function makeLineVert (x) {
    return {
        type: 'line',
        xref: 'x', yref: 'paper',
        x0: x, x1: x, y0: 0, y1: 1,
        line: { color: '#ddd', width: .5 }
    };
}

function makeLineHoriz(y) {
    return {
        type: 'line',
        xref: 'paper', yref: 'y',
        x0: 0, x1: 1, y0: y, y1: y,
        line: { color: '#ddd', width: .5 }
    };
}

function plot() {
    colorbar_title = $('.cbtitle').find('>:first-child').html();
    var count = $('#map_plot').val()=="count";

    if($('input[name="type"]:checked').val()=="heatmap") {
        //Heatmap
        let max = 0;
        z = matrix(x.length, y.length, 0);

        filtered.forEach(function (r) {
            $.csv.toArray(r[bIdx].toString()).forEach(b => {
                var xId = business.findIndex(i => (i.id === b) || (i.name === b));
                if (xId > -1)
                    $.csv.toArray(r[tIdx].toString()).forEach(t => {
                        var yId = technology.findIndex(i => (i.id === t) || (i.name === t));
                        if (yId > -1) {
                            if (count)
                                z[yId][xId]++;
                            else
                                z[yId][xId] += parseFloat(r[fIdx].replace(/,/g, ''));

                            if (z[yId][xId] > max) max = z[yId][xId];
                        }
                    });
            });
        });

        let dist = [].concat.apply([], z).calcuateDistribution();
        technology.forEach((t,i) => business.forEach((b,j) => zLab[i][j] = "NABS: " + t.name + "<br>OECD: " + b.name + "<br>Number: " + z[i][j] + "<br>Distribution: " + dist[j+(i*business.length)] + "%")); // Create Hover Labels

        let data = [];
        let layout = {};

        if($('input[name="bubble"]:checked').val()=="standard") {
            data.push({
                type: 'heatmap',
                x: x, y: y, z: z,
                text: zLab, hoverinfo: 'text',
                colorscale: getColorscale(),
                colorbar: {
                    title: colorbar_title,
                    titleside: 'right'
                }
            });
            if(max == 0) data[0]['colorscale'] = [[0, 'white'],[1, 'white']];
            if(max <  5) data[0]['colorbar']   = {autotick: false, tick0: 0.0, dtick: 1.0};

            layout = {
                title: heatmap_title,
                xaxis: {
                    title: headers[bIdx], type: 'category',
                    linewidth: 1, mirror: true
                },
                yaxis: {
                    title: headers[tIdx], type: 'category',
                    linewidth: 1, mirror: true
                },
                shapes: [6.5, 17.5, 22.5, 27.5, 36.5].map(makeLineVert).concat([10.5, 16.5].map(makeLineHoriz))
            };

         } else {
            let scaled = [].concat.apply([], z).scaleBetween(0, 100);

            for(let i=0; i<x.length; i++) {
                for(let j=0; j<y.length; j++) {
                    let val_xy = scaled[i+(j*x.length)];
                    let trace = {
                        type: 'scatter',
                        mode: 'markers',
                        hoverinfo: 'text',
                        showlegend: false,
                        x: [i],
                        y: [j],
                        text: zLab[j][i],
                        marker: {
                            size: [val_xy],
                            color: getColor((z[j][i]/max)*100)
                        }
                    };
                    data.push(trace);
                }
            }

            data.push({
                name: '',
                mode: 'markers',
                x: [0], y: [0],
                hoverinfo: 'none',
                marker: {
                    opacity: 0,
                    color: [0, max],
                    colorscale: getColorscale(),
                    colorbar: {
                        title: colorbar_title,
                        titleside: 'right',
                        tick0: 0
                    },
                    showscale: true
                }
            });

            layout = {
                title: heatmap_title,
                hovermode: 'closest',
                xaxis: {
                    title: headers[bIdx],
                    linewidth: 1, mirror: true, showgrid: false,
                    type: 'category', tickmode: "array", tickvals: Array.from(Array(x.length).keys()), ticktext: x, range: [-.5,x.length+.5]
                },
                yaxis: {
                    title: headers[tIdx],
                    linewidth: 1, mirror: true,showgrid: false,
                    type: 'category', tickmode: "array", tickvals: Array.from(Array(y.length).keys()), ticktext: y, range: [-.5,y.length+.5]
                },
                shapes: [6.5, 17.5, 22.5, 27.5, 36.5].map(makeLineVert).concat([10.5, 16.5].map(makeLineHoriz))
            };
        }

        Plotly.newPlot('graph', data, layout, {editable: true, displayModeBar: true, displaylogo: false, modeBarButtonsToRemove: hideIcons})
            .then(gd => { $(gd).off('keyup').on('keyup', (e) => { heatmap_title = e.target.innerHTML; }); }
        );

    } else {
        //Bubble Map
        let active_regions = new Set();
        let lab = [];
        let ids = $('#codes').is(':checked');

        z = new Array(regions[nuts].length).fill(0);

        if (rIdx > -1)  //Region column not provided
            filtered.forEach(e => {
                $.csv.toArray(e[rIdx]).forEach(r => {
                    if(r)
                        // Add to all "parent" regions
                        if((ids && r.length-2 >= nuts) || !ids) {
                            if(ids)
                                r = r.substring(0, nuts + 2); // Get correct NUTS-level if possible
                            var idx = regions[nuts].findIndex(i => (i.id === r) || (i.name === r) || (i.en === r));
                            if (idx > -1)
                                active_regions.add(regions[nuts][idx]);
                            if (count)
                                z[idx]++; // Project Count
                            else
                                z[idx] += parseFloat(e[fIdx].replace(/,/g, ''));
                        } else {
                            regions[nuts].reduce((a, i, idx) => {
                                a = (i.id.startsWith(r)) ? [...a, idx] : a;
                                return a
                            }, []).forEach(idx => {
                                if (idx > -1)
                                    active_regions.add(regions[nuts][idx]);
                                if (count)
                                    z[idx]++; // Project Count
                                else
                                    z[idx] += parseFloat(e[fIdx].replace(/,/g, ''));
                            });
                        }
                });
            });

        /* Calculate distribution to rescale for plotting */
        dist = z.calcuateDistribution();

        // Find min and max of lat/long
        let bounds = [[]];
        if(active_regions.size > 0) {
            bounds = [...active_regions].reduce((acc, val) => {
                return [[Math.min(val.lat, acc[0][0]), Math.max(val.lat, acc[0][1])], [Math.min(val.lon, acc[1][0]), Math.max(val.lon, acc[1][1])]]
            }, [[Number.MAX_VALUE, Number.MIN_VALUE],[Number.MAX_VALUE, Number.MIN_VALUE]]);

            // Add padding
            bounds[0][0]-=2;    // BOTTOM
            bounds[0][1]+=2;    // TOP
            bounds[1][0]-=2;    // LEFT
            bounds[1][1]+=2;    // RIGHT
        }

        /* Produce Labels*/
        z.forEach((l,i) => lab[i] = regionLab[i] + "<br>" + l + (count ? " projects" : "€") + "<br>Distribution: " + dist[i].toFixed(2) + "%" );

        if($('input[name="bubble"]:checked').val()=="bubble") {
            var data = [{
                type: 'scattergeo',
                mode: 'markers',
                lat: regionLat,
                lon: regionLon,
                hoverinfo: 'text',
                text: lab,
                marker: {
                    size: z.scaleBetween(0, 100),
                    color: z,
                    colorscale: getColorscale(),
                    line: {
                        color: 'black',
                        width: 1
                    },
                    showscale: true,
                    colorbar: {
                        title: colorbar_title,
                        titleside: 'right'
                    }
                }
            }];

            var layout = {
                title: bubble_title,
                showlegend: false,
                geo: {
                    scope: 'europe',
                    projection: {
                        type: 'miller'
                    },
                    showland: true,
                    landcolor: 'rgb(217, 217, 217)',
                    lataxis: {
                        range: bounds[0]
                    },
                    lonaxis: {
                        range: bounds[1]
                    }
                }
            };

            Plotly.newPlot('graph', data, layout, {
                editable: true,
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: hideIcons
            }).then(gd => {
                    $(gd).off('keyup').on('keyup', (e) => {
                        bubble_title = e.target.innerHTML;
                    });
                });
        } else {
            var data = [];
            var max = Math.max(...z);

            // Plot boundaries
            $.getJSON('/static/data/nuts_lvl_0.geojson', boundaries => {
                $.getJSON('/static/data/nuts_lvl_' + nuts + '.geojson', json => {
                    boundaries.features.forEach(feature =>
                        data.push({
                            type: 'scatter',
                            mode: 'lines',
                            line: {color: 'black', width: 1},
                            hoverinfo: 'none',
                            x: feature.geometry.coordinates.reduce((a, b) => {
                                    if (a) a.push('');
                                    return a.concat(b[0].map(c => c[0]));
                               }, []),
                            y: feature.geometry.coordinates.reduce((a, b) => {
                                    if (a) a.push('');
                                    return a.concat(b[0].map(c => c[1]));
                               }, [])
                        })
                    );
                    json.features.forEach(feature => {
                        var regionIdx = regions[nuts].findIndex(r => r.id == feature.properties.NUTS_ID);
                        data.push({
                            name: lab[regionIdx],
                            type: 'scatter',
                            mode: 'lines',
                            line: {color: 'grey', width: 0.5},
                            fill: 'toself',
                            connectgaps: false,
                            fillcolor: getColor((z[regionIdx]/max)*100),
                            x: feature.geometry.coordinates.length > 1 || nuts == 0 ?
                                feature.geometry.coordinates.reduce((a, b) => {
                                    if (a) a.push('');
                                    return a.concat(b[0].map(c => c[0]));
                                }, [])
                                : feature.geometry.coordinates[0].map(c => c[0]),
                            y: feature.geometry.coordinates.length > 1 || nuts == 0 ?
                                feature.geometry.coordinates.reduce((a, b) => {
                                    if (a) a.push('');
                                    return a.concat(b[0].map(c => c[1]));
                                }, [])
                                : feature.geometry.coordinates[0].map(c => c[1])
                        });
                    });
                    data.push({
                        name: 'colorbar',
                        mode: 'markers',
                        x: [0,0], y: [0,0],
                        hoverinfo: 'none',
                        marker: {
                            opacity: 0,
                            color: [0, max],
                            colorscale: getColorscale(),
                            showscale: true
                        }
                    });

                    let layout = {
                        title: bubble_title,
                        hovermode: 'closest',
                        showlegend: false,
                        xaxis: {
                            range: bounds[1],
                            visible: false
                        },
                        yaxis: {
                            range: bounds[0],
                            visible: false
                        }
                    };
                    Plotly.newPlot('graph', data, layout, {
                        editable: true,
                        displayModeBar: true,
                        displaylogo: false,
                        modeBarButtonsToRemove: hideIcons
                    }).then(gd => $(gd).off('keyup').on('keyup', (e) => bubble_title = e.target.innerHTML));
                });
            });
        }
    }

    // Click Event Handler
    var myplot = document.getElementById('graph');

    if($('input[name="type"]:checked').val()=="heatmap") {
        //Plot Comparison
        myplot.on('plotly_click', function (data) {
            $('#detail').parent().show();

            var ids = data.points[0].text.split('<br>');
            var xId = business.find(b => b.name == ids[1].substring(6)).id;
            var yId = technology.find(t => t.name == ids[0].substring(6)).id;
            var regions = {};
            filtered.forEach(r => {
                if ($.csv.toArray(r[bIdx].toString()).indexOf(xId) > -1 && $.csv.toArray(r[tIdx].toString()).indexOf(yId) > -1)
                    $.csv.toArray(r[rIdx]).forEach(region => {
                        if (!regions[region]) regions[region] = 0;
                        regions[region]++;
                    });
            });
            var keys = Object.keys(regions);
            var vals = Object.values(regions);
            var dist = vals.calcuateDistribution();
            Plotly.newPlot('detail', [{
                x: keys,
                y: vals,
                type: 'bar',
                marker: {color: vals, colorscale: [[0,'rgba(222,21,21,.2)'/*106,120,141,.2)'*/],[1,'rgba(222,21,21,1)'/*106,120,141,1)'*/]]},
                showlegend: false
            },{
                values: vals,
                labels: keys,
                type: 'pie',
                marker: {colors: dist.map(d => 'rgba(222,21,21,'/*106,120,141,'*/ + d/100 + ')')},
                textinfo: 'label+percent',
                domain: {x:[.5, 1.]},
                pull: .005
            }], {
                title: business.find(b => b.id == xId).name + ", " + technology.find(t => t.id == yId).name,
                xaxis:  {domain: [0.,.5]},
            });
        });

    } else {
        //Plot Region Heatmap
        myplot.on('plotly_click', function (data) {
            $('#detail').parent().show();

            var z3 = matrix(x.length, y.length, 0);
            let max = 0;

            var region = data.points[0].text.split('<br>')[0];
            filtered.forEach(r => {
                if($.csv.toArray(r[rIdx]).findIndex(i=>i.substring(0, nuts+2)==region)>-1){
                    $.csv.toArray(r[bIdx].toString()).forEach(b => {
                        var xId = business.findIndex(i => (i.id === b) || (i.name === b));
                        if (xId > -1)
                            $.csv.toArray(r[tIdx].toString()).forEach(t => {
                                var yId = technology.findIndex(i => (i.id === t) || (i.name === t));
                                if (yId > -1) {
                                    if (count)
                                        z3[yId][xId]++;
                                    else
                                        z3[yId][xId] += parseFloat(r[fIdx].replace(/,/g, ''));

                                    if (z3[yId][xId] > max) max = z3[yId][xId];
                                }
                            });
                    });

                }
            });

            technology.forEach((t,i)=> business.forEach((b,j)=> zLab[i][j] = "NABS: " + t.name + "<br>OECD: " + b.name + "<br>Number: " + z3[i][j]));

            var detail_data = [{
                type: 'heatmap',
                x: x, y: y, z: z3,
                text: zLab, hoverinfo: 'text',
                colorscale: getColorscale(), //[[0, $('input[name="min"]').val()], [1, $('input[name="max"]').val()] ],
                colorbar: {
                    title: colorbar_title,
                    titleside: 'right'
                }
            }];

            if(max == 0) detail_data[0]['colorscale'] = [[0, 'white'],[1, 'white']];
            if(max <  5) detail_data[0]['colorbar']   = {autotick: false, tick0: 0.0, dtick: 1.0};

            var layout = {
                title: region + " " + heatmap_title,
                xaxis: {
                    title: headers[bIdx],
                    type: 'category',
                    linewidth: 1, mirror: true
                },
                yaxis: {
                    title: headers[tIdx],
                    type: 'category',
                    linewidth: 1, mirror: true
                },
                shapes: [6.5, 17.5, 22.5, 27.5, 36.5].map(makeLineVert).concat([10.5, 16.5].map(makeLineHoriz))
            };

            Plotly.newPlot('detail', detail_data, layout);

        });

    }
}

function disableScrolling(){
    $('html, body').css({
        overflow: 'hidden',
        height: '100%'
    });
}
function enableScrolling(){
    $('html, body').css({
        overflow: 'auto',
        height: 'auto'
    });
}

function toggleFullscreen(div) {
    if($('#'+div).hasClass('full')) exitFullscreen(div);
    else                           enterFullscreen(div);
}

function enterFullscreen(div) {
    $('.full').removeClass('full'); //Toggle any view already in full screen
    $('#' + div).addClass('full');
    $('#app_settings').removeClass('btn-group-vertical').addClass('btn-group full_menu');
    if(div=="graph") $(window).resize(function() { Plotly.relayout('graph', {width: $(window).width(), height: $(window).height()}); }).resize();
    $('#'+div+'_fi').removeClass('fa-window-maximize').addClass('fa-window-minimize');
    disableScrolling();
    $('#esc').on('click', function() {exitFullscreen(div)}).show();
    $(document).on('keyup', function(e) { if (e.keyCode == 27) exitFullscreen(div) });
}

function exitFullscreen(div) {
    $('#' + div).removeClass('full');
    $('#app_settings').removeClass('btn-group full_menu').addClass('btn-group-vertical');
    if(div=="graph") Plotly.relayout('graph', {width: "740px", height: "540px"});
    $('#'+div+'_fi').addClass('fa-window-maximize').removeClass('fa-window-minimize');
    $('#esc').hide();
    enableScrolling();
}

function initFilters(){
    headers.forEach((h,idx) =>
        $('#page').append('' +
            '<div id="f_'+idx+'" class="modal fade">' +
                '<div class="modal-dialog">' +
                    '<div class="modal-content">' +
                        '<div class="modal-body">' +
                            'Contains: <input id="i_' +idx+ '" type="text">' +
                            '<div style="float: right">' +
                                '<button class="btn btn-success" data-dismiss="modal" onclick="loadSheet()">Apply</button>' +
                                '<button class="btn btn-danger" data-dismiss="modal" onclick="$(\'#i_' + idx + '\').val(\'\'); loadSheet()">Clear</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>')
    );
}

function filterData() {
    var f={};
    $('input[id^="i_"]').each((idx, i)=>{
        var v = $(i).val();
        if (v!="") f[$(i).attr('id').split("_")[1]] = v;
    });
    if($.isEmptyObject(f))
        return records;
    else
        return records.filter(r => {
            var t=true;
            for(var k in f)
                r[k].includes(f[k]) ? t&=true : t=false;
            return t;
        });
}

function step(n) {
    var el;
    switch(n) {
        case 0: el = "source"; break;
        case 1: el = "data"; break;
        case 2: el = "visualisations";
    }

    if(el)
        $('html, body').animate({
            scrollTop: $("#" + el).offset().top
        }, 2000);
}

function tutorial() {
    //Do walk-through
    var tour = new Tour({
        backdrop: true,
        steps: [
           {
               element: ".site-content",
               title: "Welcome",
               content: "Welcome to the RIS3 Innovation Maps application.<br>If this is your first time using the app, why not take a quick tour? Just click 'Next'<br>Else click 'End Tour' to start mapping."
           },{
               element: ".stepwizard",
               title: "Navigation",
               content: "Work through the following steps in order to construct an Innovation Map.<br> Click an Icon at anytime to progress to the corresponding step."
           },{
               element: "#sources",
               title: "Step #1: Data Gathering",
               content: "Select various data sources in order to begin the process. Options include..."
           },{
               element: "#if",
               title: "File Import",
               content: "Select a local file containing project level funding information.<br>Or alternatively..."
           },{
               element: "#id",
               title: "Import Data",
               content: "Select pre-classified grant data gathered by <abbr title='Gateway to Research'>GtR</abbr> (UK) or Tekes (FI).<br> Or alternatively..."
           },{
               element: "#skip",
               title: 'Skip:',
               content: "... Skip this step and upload or insert data at a later stage. From the application menu..."
           },{
               element: "#app_settings",
               title: "Application Menu",
               content: "Manage data and Visualisation settings using the following menu."
           },{
               element: "#display_settings",
               title: "Application Menu (2)",
               content: "Adjust settings concerning your data."
           },{
               element: "#data",
               title: "Step #2: Data Cleansing and Classification",
               content: "Manage your data in the online spreadsheet."
           },{
               element: "#spreadsheet",
               title: "Online Spreadsheet",
               content: "View, edit and classify data.<br>Right-click on cells and heading for more functionality."
           },{
               element: "#visualisations",
               title: "Data Visualisation and Policy Intelligence",
               content: "Visualise data as a Heatmap or Bubble Map."
           },{
               element: "#plot_options",
               title: "Plot Type",
               content: "Select between different visualisation types."
           },{
               element: ".site-content",
               title: "Let's get Started",
               content: "For more hints and tips please read the guide."
           }
       ]
    });
    tour.init();
    tour.start();
}


function render_comp(selected) {
    let d = {};

    let comp, idx;
    if(selected=="NABS") {
        comp = technology;
        idx = tIdx;
    } else {
        comp = business;
        idx = bIdx;
    }

    filtered.forEach(r => {
        //d['Technology'] = unpack(technology, 'name');
        $.csv.toArray(r[rIdx]).forEach(region => {
            if(!d[region])
                d[region] = new Array(comp.length).fill(0);
            $.csv.toArray(r[idx].toString()).forEach(t =>
                d[region][comp.findIndex(i => (i.id === t) || (i.name === t))]++
            );
        });
    });
    let data = [];
    Object.entries(d).forEach(([k,v]) => data.push({
        x: unpack(comp, 'name'), y: v, type: 'bar', name: k
    }));
    Plotly.newPlot('comp', data);
}