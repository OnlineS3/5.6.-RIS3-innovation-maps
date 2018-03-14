let select2Editor = {
    //Methods
    closeEditor: function(cell, value) {
        // Set visual value
        $("#spreadsheet").jexcel("setValue", cell, value);
        // Close edition
        $(cell).removeClass('edition');
    },
    openEditor: function(cell) {
        var main = this;

        // Get current content
        var html = $(cell).html().trim();
        var url = '', vals = [];

        switch(parseInt(cell.attr('id').split('-')[0])) {
            case rIdx:
                url = 'regions' + nuts + '.json';
                vals = regions[nuts];
                break;
            case bIdx:
                url = 'OECD.json';
                vals = business;
                break;
            case tIdx:
                url = 'NABS.json';
                vals = technology;
        }
        //Basic editor
        var editor = document.createElement('input');

        $(cell).html(editor);

        $(editor).select2({
            multiple: true,
            ajax: {
                url: '/filter',
                data: function (term) {
                    return {
                        file: url,
                        q: term
                    };
                },
                processResults: process
            }
        });

        //Preselect options
        if(html) {
            var selected = $.csv.toArray(html);
            $(editor).select2('data',
                selected.map(function (i) {
                    var matched = vals.find(v => v.id == i || v.name == i || v.en == i);
                    if (matched)
                         return {
                            id:  matched.id,
                            text: ($('#lang').val()=="en" && 'en' in matched ? matched.en : matched.name)
                        };
                    else return {id: i, text: i};
                })
            );
        }
        $(editor).on('change.select2', function() {
            let res = $.csv.fromArrays([$(this).select2("data").map(r => ($('#codes').is(':checked')? r.id : r.text))]);
            main.closeEditor($(cell), res);
            $(editor).select2('destroy');
        });
        $(window).one('click', function() {
            $(editor).change();
        });
    },
    getValue: function(cell) {
        return $(cell).html();
    },
    setValue: function (cell, value) {
        $(cell).addClass('arrow');
        $(cell).html(value.toString());
        return true;
    }
};
