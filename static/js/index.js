var CODES; // this object will be populated once the user inputs two pages
var response; // global variable for the graph db response
var queryImages; // an object to pass information to the graph
var imageURLs; // an array so it will retain order
clear_all();

// tells typeahead how to handle the user input (e.g. the get request params)
var pageNames = new Bloodhound({
    datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.value);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    limit: 50,
    remote: {
        url: '/page-names?query=%QUERY',
        // rateLimitBy: 'throttle',
        // rateLimitWait: 100,
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

function clear_partial() {
    $('.loading-images').empty();
    $('svg').remove();
    queryImages = {};
    imageURLs = [];
}

function clear_all() {
    CODES = {};
    $('input#start-node').val('');
    $('input#end-node').val('');
    clear_partial();
}

function getThumbnail(pageObject, pageKey) {
    var page = pageObject[pageKey];
    var thumbnail, thWidth, thHeight;
    if ('thumbnail' in page) { // if wikipedia query returned a thumbnail
        thumbnail = page.thumbnail.source;
        thWidth = page.thumbnail.width;
        thHeight = page.thumbnail.height;
    } else { // else returns grumpycat
        thumbnail = '../static/images/cat.jpg';
        thWidth = 100;
        thHeight = 100;
    }
    var item = {'title': page.title,
                'thumbnail': thumbnail,
                'width': thWidth,
                'height': thHeight};
    return item;
}

function addImage(item, code) {
    queryImages[code] = {'url': item.thumbnail,
                         'title': item.title,
                         'height': item.height,
                         'width': item.width};
}

function makeHTMLSnippet(node, thumbnail, title) {
    html = '<div class="page" id="page'+node.toString()+'">'+
           '<div class="squareimg"><img src='+thumbnail+'></div>';
           // +'<div class="page-title">'+title+'</div></div>';
    return html;
}

function addQueryImages(data) {
    var pageObject = data.query.pages;
    var htmlSnippets = {};
    Object.keys(pageObject).forEach(function(pageKey) {
        item = getThumbnail(pageObject, pageKey);
        if (item.title == CODES.node1.title) {node = 0;} else {node = 1;}

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
                   'pithumbsize='+size+'px&pilimit=' + numPages + '&titles=' +
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
    var path = $('.loading-images');

    $.when(

        $.getJSON( // get the start/end images from Wikipedia API
            queryURL,
            function(data) {
                var htmlSnippets = addQueryImages(data);
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
        path.empty();
        drawGraph(response.results);
        sideBar();
    });
}

function getPathImages(queryURL) {
    return $.getJSON( // get the inner node images from Wikipedia API
        queryURL,
        function(data) {
            addPathImages(data); //updates queryImages with inner ndoes
            // updates queryImages with index numbers for ordering
            response.path.forEach(function(node) {
                queryImages[node.code].code = response.path.indexOf(node);
            });
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

    // get tiny images for the path nodes
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
    $('.node').click(function() {
        var title = this.id.split('|')[0];
        console.log(title);
        window.open('http://en.wikipedia.org/wiki/' + title);
    });
}

function feelingLucky(inputField, node) {
    $.get(
        '/page-names',
        'query='+inputField.val(),
        function(data) {
            result = data.results[0]; // uses the first result
            inputField.val(result.title);
            CODES[node] = {'title': result.title,
                           'code': result.code.toString()};
            if (CODES.node1 !== undefined & CODES.node2 !== undefined) {
                query();
            }
    });
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

// event handler for the query submission
$('input#submit-query').click(function() {
    clear_partial();

    var startField = $('#start-node');
    var endField = $('#end-node');

    if (CODES.node1 !== undefined) {
        if (startField.val() != CODES.node1.title) {
            feelingLucky(startField, 'node1');
        }
    }

    if (CODES.node2 !== undefined) {
        if (endField.val() != CODES.node2.title) {
            feelingLucky(endField, 'node2');
        }
    }

    try {
        query();
    } catch (e) {

        if (!(CODES.node1)) { // if either/both fields not chosen
            feelingLucky(startField, 'node1');
        }

        if (!(CODES.node2)) { // if either/both fields not chosen
            feelingLucky(endField, 'node2');
        }
    }
});

$('input#random-query').click(function() {
    getRandomPages();
});

// sets up the typeahead on the two input fields
$('.scrollable-dropdown-menu .typeahead').typeahead(null, {
    name: 'pageNames',
    displayKey: 'value',
    source: pageNames.ttAdapter()
});

// records the values chosen for each field as a global var
$('#start-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node1');
});

$('#end-node').on('typeahead:selected typeahead:autocompleted', function (e, d) {
    decodeInput(d, 'node2');
});

$('input[type=text]').focus(function(){ // click into the text field, select all
    this.select();
});


