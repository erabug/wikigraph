//------------ FUNCTIONS ------------//
function clear_partial() {
    $('svg').remove();
    path.empty();
    queryImages = {};
    imageURLs = [];
}

function clear_all() {
    CODES = {};
    startField.val('');
    endField.val('');
    clear_partial();
}

function getThumbnail(pageObject, pageKey) {
    var page = pageObject[pageKey];
    var thumbnail, width, height;
    if ('thumbnail' in page) { // if wikipedia query returned a thumbnail
        thumbnail = page.thumbnail.source;
        width = page.thumbnail.width;
        height = page.thumbnail.height;
    } else { // else returns grumpycat
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

function addImage(item, code) {
    queryImages[code] = {'url': item.thumbnail,
                         'title': item.title,
                         'height': item.height,
                         'width': item.width};
}

function makeHTMLSnippet(node, thumbnail, title) {
    html = '<div class="page" id="page' + node.toString() + '">' +
           '<div class="squareimg"><img src=' + thumbnail + '></div>';
    return html;
}

function addQueryImages(data) {
    var pageObject = data.query.pages;
    var htmlSnippets = {};
    Object.keys(pageObject).forEach(function(pageKey) {
        item = getThumbnail(pageObject, pageKey);
        if (item.title == CODES.node1.title) {
            node = 0;
        } else {
            node = 1;
        }
        htmlSnippets[node] = makeHTMLSnippet(node, item.thumbnail, item.title);
        addImage(item, CODES['node'+(node+1)].code);
        imageURLs[node] = {'title': item.title,
                           'thumbnail': item.thumbnail};
    });
    return htmlSnippets;
}

function getPathCode(title) {
    var code;
    response.path.forEach(function(pathNode) {
        if (pathNode.title == title) {
           code = pathNode.code;
        }
    });
    return code;
}

function addPathImages(data) {
    var pageObject = data.query.pages;
    Object.keys(pageObject).forEach(function(pageKey) {
        item = getThumbnail(pageObject, pageKey);
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
                var htmlSnippets = addQueryImages(data);
                // console.log('QUERY IMAGES', queryImages);
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
    // updates queryImages with index numbers for ordering purposes
    response.path.forEach(function(node) {
        queryImages[node.code].code = response.path.indexOf(node);
    });
}

function getPathImages(queryURL) {
    return $.getJSON( // get the inner node images from Wikipedia API
        queryURL,
        function(data) {
            addPathImages(data); //updates queryImages with inner ndoes
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
                item = getThumbnail(pageObject, pageKey);
                code = getPathCode(item.title);
                queryImages[code].tinyurl = item.thumbnail;
                queryImages[code].tinyHeight = item.height;
                queryImages[code].tinyWidth = item.width;
            });
            displaySummary(response.path);
        });
}

function makeExtractURL(numPages, pageParams) {
    var extractURL = 'http://en.wikipedia.org/w/api.php' +
                     '?action=query&prop=extracts&format=json&' +
                     'exsentences=3&' +
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
                queryImages[code].extract = text; // add it to queryImages
            });
        });
}

function getImageAndExtract(title, code) {
    
    var queryURL = makeQueryURL(150, 1, title);
    var extractURL = makeExtractURL(1, title);
    $.when(
        $.getJSON( // get image for moused over node
        queryURL,
        function(data) {
            var pageObject = data.query.pages;
            Object.keys(pageObject).forEach(function(pageKey) {
                item = getThumbnail(pageObject, pageKey);
                addImage(item, code); // this updates queryImages
            });
        })
        ).then(function(data) {
            return $.getJSON(
                extractURL,
                function(data) {
                    var thing = data.query.pages;
                    var page = thing[Object.keys(thing)[0]];
                    var text = page.extract;
                    queryImages[code].extract = text;
            });
        }).done(function(data) {
            $('.page-image').html('<img src=' + queryImages[code].url +
                ' style="border:solid 2px #666; background-color: #fff">');
            $('.page-extract').html(queryImages[code].extract);
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
    $('.node').mouseover(function(e) {
        $('.details').toggleClass('hidden');
        var info = this.id.split('|');
        var title = info[0];
        var code = info[1];
        $('.page-title').html(title);
        if (code in queryImages) {
            $('.page-image').html('<img src=' + queryImages[code].url +
                ' style="border:solid 2px #666; background-color: #fff">');
            $('.page-extract').html(queryImages[code].extract);
        } else {
            getImageAndExtract(title, code);
        }
    });
    $('.node').mouseout(function(e) {
        $('.details').toggleClass('hidden');
        $('.page-image').empty();
        $('.page-title').empty();
        $('.page-extract').empty();
    });
    externalLink();
}

function externalLink() {
    $('.node').dblclick(function() {
        var title = this.id.split('|')[0];
        window.open('http://en.wikipedia.org/wiki/' + title);
    });
}

function feelingLucky(inputField, node) {
    if (!(CODES[node])) {
        return $.get(
            '/page-names',
            'query='+inputField.val(),
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
            var n1 = data.results[0];
            var n2 = data.results[1];
            CODES.node1 = {'title': n1.title,
                           'code': n1.code.toString()};
            CODES.node2 = {'title': n2.title,
                           'code': n2.code.toString()};
            $('input#start-node').val(n1.title); // fill in the search fields
            $('input#end-node').val(n2.title);
        });
}

function reverseQuery() {
    x = startField.val();
    startField.val(endField.val());
    endField.val(x);
}

//------------ VARIABLES ------------//
var CODES; // this object will be populated once the user inputs two pages
var response; // global variable for the graph db response
var queryImages; // an object to pass information to the graph
var imageURLs; // an array so it will retain order

var startField = $('#start-node');
var endField = $('#end-node');
var path = $('.loading-images');

clear_all();

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

pageNames.initialize(); // initialize the bloodhound

//------------EVENT HANDLERS------------//
$('input#submit-query').click(function() {
    clear_partial();
    // confirm that both fields are complete
    checkFirst = feelingLucky(startField, 'node1');
    checkLast = feelingLucky(endField, 'node2');
    $.when(
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