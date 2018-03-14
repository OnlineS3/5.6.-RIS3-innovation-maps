function matrix(cols, rows, defaultVal) {
    return [...Array(rows).keys()].map(i => Array(cols).fill(defaultVal));
}

function unpack(rows, key) {
    return rows.map((row)=>row[key]);
}

Array.prototype.calcuateDistribution = function() {
    var sum = this.reduce((a, b) => a + b, 0);
    return this.map(i => Math.round((i / sum) * 100));
};

Array.prototype.scaleBetween = function(scaledMin, scaledMax) {
  var max = Math.max.apply(Math, this);
  var min = Math.min.apply(Math, this);
  return this.map(num => (scaledMax-scaledMin)*(num-min)/(max-min)+scaledMin);
};

function JSONToCSV(json) {
    var csv = [];
    json.forEach(function(object) {
        var o = [];
        for (var h of Object.keys(json[0]))
            o.push(object[h]);
        csv.push(o);
    });
    return csv;
}

function CSVToJSON(headers, records) {
    var json = [];
    records.forEach(function(record) {
        var o = {};
        headers.forEach(function(header, idx) {
            o[header] = record[idx];
        });
        json.push(o);
    });
    return json;
}

/*
    function excel() {
      window.open('data:application/vnd.ms-excel;base64,' + base64_encode($('#spreadsheet').prop('outerHTML')));
    }
    function base64_encode (data) {
      var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = [];
      if (!data) return data;
      do { // Pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);
        bits = o1 << 16 | o2 << 8 | o3;
        h1 = bits >> 18 & 0x3f;
        h2 = bits >> 12 & 0x3f;
        h3 = bits >> 6 & 0x3f;
        h4 = bits & 0x3f;
        // Use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
      } while (i < data.length);
      enc = tmp_arr.join('');
      var r = data.length % 3;
      return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
    }
*/

function process(data) {
    return {
        results: JSON.parse(data).map((i) => {
            return {
                text: ($('#lang').val()=="en" ? ('en' in i ? i.en : i.name) : i.name),
                id: i.id
            }
        })
    }
}

function toggle(opt, div) {
    div = $('#' + div).collapse('toggle');
    div.next().toggle();
    var sym = $(opt).children(':first');
    sym.attr('class', (sym.hasClass('fa-eye') ? 'fa fa-eye-slash' : 'fa fa-eye'));
}

function scrollTo(hash){
    $('html, body').animate({ scrollTop: $(hash).offset().top }, 800, function(){
          window.location.hash = hash;
    });
}

function interpolateColor(c1, c2, factor) {
    c1 = h2r(c1), c2 = h2r(c2);
    var result = c1.slice();
    for (var i = 0; i < 3; i++)
        result[i] = Math.round(result[i] + factor * (c2[i] - c1[i]));
    return rgbToHex(result);
}

// Converts a #ffffff hex string into an [r,g,b] array
function h2r(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : null;
}

// Converts an [r,g,b] array into a #ffffff hex string
function rgbToHex(result) {
    return "#" + ((1 << 24) + (result[0] << 16) + (result[1] << 8) + result[2]).toString(16).slice(1);
}