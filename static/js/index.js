/**
 * FUNCTION DEFINITIONS
 */
function clear_partial() {
    $('svg').remove();
    path.empty();
    queryInfo = {};
    imageURLs = [];
}

function clear_all() {
    CODES = {};
    startField.val('');
    endField.val('');
    clear_partial();
}

function createThumbnailObject(page) {
    var thumbnail, width, height;
    if ('thumbnail' in page) { // if wikipedia query returned a thumbnail
        thumbnail = page.thumbnail.source;
        width = page.thumbnail.width;
        height = page.thumbnail.height;
    } else {
        thumbnail = '../static/images/cat.jpg'; // else returns grumpycat
        width = 100;
        height = 100;
    }
    var item = {'title': page.title,
                'thumbnail': thumbnail,
                'width': width,
                'height': height};
    return item;
}

function addImage(item, code) {
    queryInfo[code] = {'url': item.thumbnail,
                       'title': item.title,
                       'height': item.height,
                       'width': item.width};
}

function makeHTMLSnippet(node, thumbnail) {
    html = '<div class="page" id="page' + node.toString() + '">' +
           '<div class="squareimg"><img src=' + thumbnail + '></div>';
    return html;
}

function addQueryInfo(data) {
    var pageObject = data.query.pages;
    var htmlSnippets = {};
    Object.keys(pageObject).forEach(function(pageKey) {
        item = createThumbnailObject(pageObject[pageKey]);
        if (item.title == CODES.node1.title) code = 0; else code = 1;
        htmlSnippets[code] = makeHTMLSnippet(code, item.thumbnail);
        addImage(item, CODES['node'+(code+1)].code); // updates queryInfo
        imageURLs[code] = {'title': item.title,
                           'thumbnail': item.thumbnail};
    });
    return htmlSnippets;
}

function getPathCode(title) {
    for (var i = 0; i < response.path.length; i++) {
        if (response.path[i].title == title) {
            return response.path[i].code;
        }
    }
}

function addPathImages(data) {
    var pageObject = data.query.pages;
    Object.keys(pageObject).forEach(function(pageKey) {
        var item = createThumbnailObject(pageObject[pageKey]);
        addImage(item, getPathCode(item.title));
    });
}

function makeQueryURL(size, numPages, pagesParams) {
    var queryURL = 'http://en.wikipedia.org/w/api.php' +
                   '?action=query&format=json&redirects&prop=pageimages&' +
                   'pithumbsize='+ size +'px&pilimit=' + numPages + '&titles=' +
                   pagesParams + '&callback=?';
    return queryURL;
}

function decodeInput(d, node) {
    CODES[node] = {'title': d.value,
                   'code': d.code.toString()};
}

function query() {
    var pagesParams = CODES.node1.title + '|' + CODES.node2.title;
    var queryURL = makeQueryURL(size=150, numPages=2, pagesParams);
    $.when(
        $.getJSON( // get the start/end images from Wikipedia API
            queryURL,
            function(data) {
                var htmlSnippets = addQueryInfo(data);
                Object.keys(htmlSnippets).forEach(function(node) {
                    path.append(htmlSnippets[node]);
                });
                $('#page0').after('<div class="page loading"></div>');
        }),
        $.get( // get the shortest path from the database
            '/query',
            CODES,
            function(data) {
                response = JSON.parse(data); // decode the JSON
                console.log('RETURNED PATH:', response.path);
            })
    ).then(function(data) {
        var inner = response.path.slice(1, -1);
        var numPages = inner.length;
        var innerNodes = [];
        inner.forEach(function(node) {
            innerNodes.push(node.title);
        });
        var pagesParams;
        if (numPages > 1) {
            pagesParams = innerNodes.join('|');
        } else { pagesParams = innerNodes; }
        var queryURL = makeQueryURL(size=150, numPages, pagesParams);
        if (inner.length === 0) {
            return false;
        } else { // if there are intermediary nodes
            return getPathImages(queryURL);
        }
    }).done(function() {

        updateIndexCodes();
        path.empty();
        drawGraph(response.results);
        sideBar();
    });
}

function updateIndexCodes() {
    // updates queryInfo with index numbers for ordering purposes
    response.path.forEach(function(node) {
        queryInfo[node.code].code = response.path.indexOf(node);
    });
}

function getPathImages(queryURL) {
    return $.getJSON( // get the inner node images from Wikipedia API
        queryURL,
        function(data) {
            addPathImages(data); //updates queryInfo with inner ndoes
            updateIndexCodes();
        });
}

function getSummaryImages(numPages, pageParams) {
    queryURL = makeQueryURL(size=60, numPages, pageParams);
    $.getJSON(
        queryURL,
        function(data) {
            var pageObject = data.query.pages;
            Object.keys(pageObject).forEach(function(pageKey) {
                item = createThumbnailObject(pageObject[pageKey]);
                code = getPathCode(item.title);
                queryInfo[code].tinyurl = item.thumbnail;
                queryInfo[code].tinyHeight = item.height;
                queryInfo[code].tinyWidth = item.width;
            });
            displaySummary(response.path);
        });
}

function makeExtractURL(numPages, pageParams) {
    var extractURL = 'http://en.wikipedia.org/w/api.php' +
                     '?action=query&prop=extracts&format=json&' +
                     'exsentences=3&explaintext=&' +
                     'exintro=&exlimit='+ numPages + '&titles=' +
                     pageParams + '&callback=?';
    return extractURL;
}

function getPathExtracts(numPages, pageParams) {
    var extractURL = makeExtractURL(numPages, pageParams);
    $.getJSON(
        extractURL,
        function(data) {
            var extracts = data.query.pages;
            Object.keys(extracts).forEach(function(key) {
                var text = extracts[key].extract;
                var code = getPathCode(extracts[key].title);
                queryInfo[code].extract = text; // add it to queryInfo
            });
        });
}

function getImageAndExtract(title, code, that) {
    var queryURL = makeQueryURL(150, 1, title);
    var extractURL = makeExtractURL(1, title);
    $.when(
        $.getJSON( // get image for moused-over node
        queryURL,
        function(data) {
            var pageObject = data.query.pages;
            Object.keys(pageObject).forEach(function(pageKey) {
                item = createThumbnailObject(pageObject[pageKey]);
                addImage(item, code); // this updates queryInfo
            });
        })
        ).then(function(data) {
            return $.getJSON( // get extract for moused-over node
                extractURL,
                function(data) {
                    var thing = data.query.pages;
                    var page = thing[Object.keys(thing)[0]];
                    var text = page.extract;
                    queryInfo[code].extract = text;
            });
        }).done(function(data) { // only write to div if user is still hovering
            if ($(that).is(':hover')) {
                pageImage.html('<img src=' + queryInfo[code].url +
                    ' style="border:solid 2px #666; background-color: #fff">');
                pageExtract.html(queryInfo[code].extract);
            }
        });
}

function externalLink() {
    $('.node').dblclick(function() {
        var title = this.id.split('|')[0];
        window.open('http://en.wikipedia.org/wiki/' + title);
    });
}

function sideBar() {
    var pathNodes = [];
    response.path.forEach(function(node) {
        pathNodes.push(node.title);
    });
    var pageParams = pathNodes.join('|');
    var numPages = pathNodes.length;
    getSummaryImages(numPages, pageParams); // get thumbnails for summary
    getPathExtracts(numPages, pageParams); // get extracts for path nodes
    $('.node').mouseover(function(e) { // mouseover event handler
        toggleSidebar();
        var info = this.id.split('|');
        var title = info[0],
            code = info[1];
        pageTitle.html(title);
        if (code in queryInfo) {
            pageImage.html('<img src=' + queryInfo[code].url +
                ' style="border:solid 2px #666; background-color: #fff">');
            pageExtract.html(queryInfo[code].extract);
        } else {
            getImageAndExtract(title, code, this);
        }
    });
    $('.node').mouseout(function(e) {
        clearSidebar();
    });
    externalLink();
}

function feelingLucky(inputField, node) {
    if (!(CODES[node])) {
        return $.get(
            '/page-names',
            'query=' + inputField.val(),
            function(data) {
                result = data.results[0]; // uses the first result
                inputField.val(result.title);
                CODES[node] = {'title': result.title,
                               'code': result.code.toString()};
            });
    }
}

function getRandomPages() {
    $.get('/random-query',
        function(data) {
            var n1 = data.results[0],
                n2 = data.results[1];
            CODES.node1 = {'title': n1.title,
                           'code': n1.code.toString()};
            CODES.node2 = {'title': n2.title,
                           'code': n2.code.toString()};
            startField.val(n1.title); // fill in the search fields
            endField.val(n2.title);
        });
}

function reverseQuery() {
    var x = startField.val();
    startField.val(endField.val());
    endField.val(x);
    var y = CODES.node1;
    CODES.node1 = CODES.node2;
    CODES.node2 = y;
}

function toggleSidebar() {
    details.toggleClass('hidden');
}

function clearSidebar() {
    toggleSidebar();
    help.empty();
    pageImage.empty();
    pageTitle.empty();
    pageExtract.empty();
}

function onLoadHandlers() {
    $('input#submit-query').click(function() {
        clear_partial();
        checkFirst = feelingLucky(startField, 'node1');
        checkLast = feelingLucky(endField, 'node2');
        $.when( // confirm that both fields are complete
            checkFirst,
            checkLast
            ).then(function(data) {
                query();
            });
    });

    $('input#random-query').click(function() {
        getRandomPages();
    });

    $('input#reverse-query').click(function() {
        reverseQuery();
    });

    // sets up the typeahead on the two input fields
    $('.scrollable-dropdown-menu .typeahead').typeahead(null, {
        name: 'pageNames',
        displayKey: 'value',
        source: pageNames.ttAdapter()
    });

    // delete the code value as soon as the user clicks into an input field
    startField.focus(function() {
        delete CODES['node1'];
    });

    endField.focus(function() {
        delete CODES['node2'];
    });

    // records the values chosen for each field as a global var
    startField.on('typeahead:selected typeahead:autocompleted', function (e, d) {
        decodeInput(d, 'node1');
    });

    endField.on('typeahead:selected typeahead:autocompleted', function (e, d) {
        decodeInput(d, 'node2');
    });

    // select all text when the user clicks into an input field
    $('input[type=text]').focus(function(){
        this.select();
    });

    // help button mouseover handler 
    wtf.mouseover(function() {
        clearSidebar();
        help.html(helpContent);
    });

    wtf.mouseout(function() {
        clearSidebar();
    });
}

/**
 * VARIABLE DEFINITIONS
 */
var CODES, // this object will be populated once the user inputs two pages
    response, // global variable for the graph db response
    queryInfo, // an object to pass information to the graph
    imageURLs; // an array so it will retain order

var startField = $('#start-node'),
    endField = $('#end-node'),
    path = $('.loading-images'),
    details = $('.details'),
    pageImage = $('.page-image'),
    pageTitle = $('.page-title'),
    pageExtract = $('.page-extract'),
    wtf = $('.wtf');
    help = $('.help');

// sets up the request parameters for Typeahead
var pageNames = new Bloodhound({
    datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.value);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 50,
    remote: {
        url: '/page-names?query=%QUERY',
        filter: function(pageNames) {
            // Map the remote source JSON array to a JavaScript array
            return $.map(pageNames.results, function(page) {
                return {
                    value: page.title,
                    code: page.code
                };
            });
        }
    }
});

var helpContent = '<p><input class="button" type="submit" value="Go"><p>' +
                  '<p>Find a shortest path between two pages. You can select ' +
                  'title suggestions from the drop-down menu or simply enter ' +
                  'keywords.</p>' +
                  '<p><input class="button" type="submit" value="Random"><p>' +
                  '<p>Populates the page fields with ' +
                  'titles randomly selected from non-list pages that have a ' +
                  'high number of outgoing links.</p>' +
                  '<p><input class="button" type="submit" value="Reverse"><p>' +
                  '<p>Swaps the two selections.</p>';

clear_all();
pageNames.initialize(); // initialize the bloodhound
onLoadHandlers();
