 /**
 * INPUT-RELATED
 */

 // define the start and end input fields
var startField = $('#start-node'),
    endField = $('#end-node');

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

// send input to the pagenames db, take the first result as the query input
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

// send request to the pagenames db, write the results to the input fields
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

// swap both the input field and the global CODES values
function reverseQuery() {
    var x = startField.val();
    startField.val(endField.val());
    endField.val(x);
    var y = CODES.node1;
    CODES.node1 = CODES.node2;
    CODES.node2 = y;
}

// take the input field value and assign it to CODES
function decodeInput(d, node) {
    CODES[node] = {'title': d.value,
                   'code': d.code.toString()};
}

// when the 'Go' button is clicked, check for both values, then run query
$('input#submit-query').click(function() {
    clearPartial();
    about.addClass('hidden');
    checkFirst = feelingLucky(startField, 'node1');
    checkLast = feelingLucky(endField, 'node2');
    $.when(
        checkFirst,
        checkLast
        ).then(function(data) {
            query();
        });
});

// get and display random pages when the 'Random' button is clicked
$('input#random-query').click(function() {
    getRandomPages();
});

// reverse the pages when the 'Reverse' button is clicked
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

// when a suggested title is selected, write that value to CODES
startField.on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node1');
});

endField.on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node2');
});

// select all text when the user clicks into an input field
$('input[type=text]').focus(function() {
    this.select();
});

// initialize the bloodhound
pageNames.initialize();

/**
 * QUERY-RELATED
 */

// define the path DOM element
var path = $('.loading-images');

// create and return a query URL for images, based on desired size, number of 
// pages, and the page titles
function makeQueryURL(size, numPages, pagesParams) {
    var queryURL = 'http://en.wikipedia.org/w/api.php' +
                   '?action=query&format=json&redirects&prop=pageimages&' +
                   'pithumbsize='+ size +'px&pilimit=' + numPages + '&titles=' +
                   pagesParams + '&callback=?';
    return queryURL;
}

// create and return an object with information about the thumbnail image, if
// available, else use information about the default cat image
function createThumbnailObject(page) {
    var thumbnail, width, height;
    if ('thumbnail' in page) {
        thumbnail = page.thumbnail.source;
        width = page.thumbnail.width;
        height = page.thumbnail.height;
    } else {
        thumbnail = '../static/images/cat.jpg';
        width = 100;
        height = 100;
    }
    var item = {'title': page.title,
                'thumbnail': thumbnail,
                'width': width,
                'height': height};
    return item;
}

// create and return an HTML snippet using the page's code and image url
function makeHTMLSnippet(code, thumbnail) {
    html = '<div class="page" id="page' + code.toString() + '">' +
           '<div class="squareimg"><img src=' + thumbnail + '></div>';
    return html;
}

// add information about a page to the global variable queryInfo
function addImage(item, code) {
    queryInfo[code] = {'url': item.thumbnail,
                       'title': item.title,
                       'height': item.height,
                       'width': item.width};
}

// create and return both HTML snippets for the two query pages, and update
// the global variables queryInfo and imageURLs
function addQueryInfo(data) {
    var pageObject = data.query.pages;
    var htmlSnippets = {};
    Object.keys(pageObject).forEach(function(pageKey) {
        item = createThumbnailObject(pageObject[pageKey]);
        if (item.title == CODES.node1.title) code = 0; else code = 1;
        htmlSnippets[code] = makeHTMLSnippet(code, item.thumbnail);
        addImage(item, CODES['node' + (code + 1)].code);
        imageURLs[code] = {'title': item.title,
                           'thumbnail': item.thumbnail};
    });
    return htmlSnippets;
}

// compare a title to each page object in response.path and return the
// matching page object's code number
function getPathCode(title) {
    for (var i = 0; i < response.path.length; i++) {
        if (response.path[i].title == title) {
            return response.path[i].code;
        }
    }
}

// parse the results of an AJAX images request and add information about those
// images to queryInfo
function addPathImages(data) {
    var pageObject = data.query.pages;
    Object.keys(pageObject).forEach(function(pageKey) {
        var item = createThumbnailObject(pageObject[pageKey]);
        addImage(item, getPathCode(item.title));
    });
}

// updates queryInfo with index numbers for ordering purposes
function updateIndexCodes() {
    response.path.forEach(function(node) {
        if (!(queryInfo[node.code])) {
            queryInfo[node.code] = queryInfo['undefined'];
            delete queryInfo['undefined'];
            var old_index = response.path.indexOf(node);
            response.path[old_index] = {'code': node.code,
                                        'title': queryInfo[node.code].title};
        }
        queryInfo[node.code].code = response.path.indexOf(node);
    });
}

// given a query URL, request a number of page images from Wikipedia, then
// update queryInfo and add index codes to each page to retain path order
function getPathImages(queryURL) {
    return $.getJSON(
        queryURL,
        function(data) {
            addPathImages(data);
            updateIndexCodes();
        });
}

// parse the inner nodes of the path, if they exist then assemble a query URL 
// and request those images from Wikipedia
function getInnerImages() {
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
    
    if (inner.length === 0) {
        return false;
    } else {
        var queryURL = makeQueryURL(size=150, numPages, pagesParams);
        return getPathImages(queryURL);
    }
}

// assemble and request query for start/end images from Wikipedia and append
// those to the path div, then request a shortest path from the graph database,
// then get images for the resulting path, update the index codes, draw the
// grah, and set up event handlers for the sidebar
function query() {
    var pagesParams = CODES.node1.title + '|' + CODES.node2.title;
    var queryURL = makeQueryURL(size=150, numPages=2, pagesParams);
    $.when(
        $.getJSON(
            queryURL,
            function(data) {
                var htmlSnippets = addQueryInfo(data);
                Object.keys(htmlSnippets).forEach(function(node) {
                    path.append(htmlSnippets[node]);
                });
                $('#page0').after('<div class="page loading"></div>');
            }),
        $.get(
            '/query',
            CODES,
            function(data) {
                response = JSON.parse(data);
            })
    ).then(function() {
        try {
            return getInnerImages();
        } catch(err) {}
    }).done(function() {
        path.empty();
        if (response.path != 'None') {
            updateIndexCodes();
            path.empty();
            drawGraph(response.results);
            sideBar();
        } else {
            $('.path-not-found').removeClass('hidden');
        }
    });
}

 /**
 * PATH-RELATED
 */

// define the DOM elements for the sidebar
var details = $('.details'),
    pageImage = $('.page-image'),
    pageTitle = $('.page-title'),
    pageExtract = $('.page-extract');

// create and return the query URL for extracts from Wikipedia's API, based on
// number of pages and their titles
function makeExtractURL(numPages, pageParams) {
    var extractURL = 'http://en.wikipedia.org/w/api.php' +
                     '?action=query&prop=extracts&format=json&' +
                     'exsentences=3&explaintext=&' +
                     'exintro=&exlimit=' + numPages + '&titles=' +
                     pageParams + '&callback=?';
    return extractURL;
}

// create URLs for the page and extract queries for a title, then execute the 
// image request, update queryInfo, then execute the extract request, updata
// queryInfo, then add both to their respective DOM elements
function getImageAndExtract(title, code, that) {
    var queryURL = makeQueryURL(150, 1, title);
    var extractURL = makeExtractURL(1, title);
    $.when(
        $.getJSON(
        queryURL,
        function(data) {
            var pageObject = data.query.pages;
            Object.keys(pageObject).forEach(function(pageKey) {
                item = createThumbnailObject(pageObject[pageKey]);
                addImage(item, code);
            });
        })
        ).then(function(data) {
            return $.getJSON(
                extractURL,
                function(data) {
                    var thing = data.query.pages;
                    var page = thing[Object.keys(thing)[0]];
                    var text = page.extract;
                    queryInfo[code].extract = text;
            });
        }).done(function(data) {
            // only write to div if user is still hovering
            if ($(that).is(':hover')) {
                pageImage.html('<img src=' + queryInfo[code].url +
                    ' style="border:solid 2px #666; background-color: #fff">');
                pageExtract.html(queryInfo[code].extract);
            }
        });
}

// toggles whether the sidebar is displayed
function toggleSidebar() {
    details.toggleClass('hidden');
}

// clears all divs in the sidebar
function clearSidebar() {
    toggleSidebar();
    pageImage.empty();
    pageTitle.empty();
    pageExtract.empty();
}

// opens an external window for the wikipedia page for a given title
function externalLink() {
    $('.node').dblclick(function() {
        var title = this.id.split('|')[0];
        window.open('http://en.wikipedia.org/wiki/' + title);
    });
}

// request extracts for pages in the returned path, update queryInfo with those
function getPathExtracts(numPages, pageParams) {
    var extractURL = makeExtractURL(numPages, pageParams);
    $.getJSON(
        extractURL,
        function(data) {
            var extracts = data.query.pages;
            Object.keys(extracts).forEach(function(key) {
                var text = extracts[key].extract;
                var code = getPathCode(extracts[key].title);
                queryInfo[code].extract = text;
            });
        });
}

// handles all mouseover and mouseout events for nodes, requesting information
// from Wikipedia if the information is not in queryInfo already
function mouseoverHandler() {
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

// takes the result of a query and requests images and extracts from Wikipedia,
// then sets up the node mouseover handler
function sideBar() {
    var pathNodes = [];
    response.path.forEach(function(node) {
        pathNodes.push(node.title);
    });
    var pageParams = pathNodes.join('|');
    var numPages = pathNodes.length;
    getSummaryImages(numPages, pageParams); // get thumbnails for summary
    getPathExtracts(numPages, pageParams); // get extracts for path nodes
    mouseoverHandler();
}

/**
 * PAGE-RELATED
 */

// define the global variables
var CODES, // this object will be populated once the user inputs two pages
    response, // global variable for the graph db response
    queryInfo, // an object to pass information to the graph
    imageURLs; // an array so it will retain order

// define the DOM elements for the help, about, and form divs
var wtf = $('.wtf'),
    help = $('.help'),
    about = $('.about'),
    queryForm = $('.query-form');

// clears the information for a new query, retains information about previous
// searches
function clearPartial() {
    $('svg').remove();
    path.empty();
    queryInfo = {};
    imageURLs = [];
    $('.path-not-found').addClass('hidden');
}

// full clear of all global variables and input fields
function clearAll() {
    CODES = {};
    startField.val('');
    endField.val('');
    clearPartial();
}

// toggles diplay for the help button upon mouseover and mouseout
wtf.mouseover(function() {
    clearSidebar();
    help.toggleClass('hidden');
});

wtf.mouseout(function() {
    clearSidebar();
    help.toggleClass('hidden');
});

// toggles display for the query-form when the title is clicked
$('.title').click(function() {
    clearAll();
    queryForm.removeClass('hidden');
    about.addClass('hidden');
});

// toggles display for the information page when the 'About' button is clicked
$('.info').click(function() {
    clearPartial();
    queryForm.addClass('hidden');
    about.removeClass('hidden');
});

// clears everything upon page load
clearAll();
