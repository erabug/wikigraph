function displaySummary(path) {
    // iterate through path, if item is in queryImages, grab it and make a clip-path
    var svg = d3.select(".summary").append("svg")
        .attr("width", 200)
        // .attr("height", 400); //65 * len(path)
        .attr("height", function(d) {
            // console.log('height:', 55 * path.length);
            return 50 * path.length;
        });

    var defs = svg.append("defs");

    // console.log('path', path);

    Object.keys(queryImages).forEach(function(key) {

        img = queryImages[key];

        defs.append("clipPath")
            .attr("id", 'timg'+key.toString())
          .append("circle")
            .attr("r", 20);
    });

    var tinyNode = svg.selectAll("g.tinyNode")
            .data(path)
        .enter().append("svg:g")
            .attr("class", "tinyNode")
            .attr("transform", function(d) {
                var index = queryImages[d.code].code;
                var yValue = 25 + (index * 50);
                return "translate(23, " + yValue + ")";
            })
            .attr("id", function(d) {return d.title + '|' + d.code;});

    // console.log(tinyNode);
    tinyNode.append("image")
        .attr("xlink:href", function(d) {
            return queryImages[d.code].tinyurl;
        })
        .attr("x", function(d) { return -queryImages[d.code].tinyWidth/2;})
        // this seems to help for portraits, where height > width
        .attr("y", function(d) {
            var h = queryImages[d.code].tinyHeight;
            var x;
            if (h > queryImages[d.code].tinyWidth) { x = 6; } else { x = 0; }
            return -(h/2)+x;
        })
        .attr("height", function(d) { return queryImages[d.code].tinyHeight;})
        .attr("width", function(d) { return queryImages[d.code].tinyWidth;})
        .attr("clip-path", function(d) {
            var x = 'timg'+d.code;
            return "url(#"+x+")"; // unique clip path for this node
        });

    tinyNode.append("circle")
        .attr("r", 20)
        .style("stroke", "#333")
        .style("stroke-width", "2px")
        .style("fill", "none");

    // tinyNode.append("text")
    //     .text(function(d) {
    //         console.log('title:', title, 'length:', title.length);
    //         return d.title;
    //     })
    //     .attr("font-size", 14)
    //     .attr("x", 30)
    //     .attr("y", 5);

    var w = 145,
        h = 45;

    tinyNode.append("foreignObject")
        .attr({width: w, height: h})
        .attr({x: 30, y: function(d) {
            var yMod;
            var len = d.title.length;
            // console.log('title length:', d.title.length);
            if (len > 42) {
                yMod = -22;
            } else if (len > 21) {
                yMod = -12;
            } else {
                yMod = -6;
            }
            return yMod;
        }})
        .append("xhtml:body")
        .append("xhtml:div")
        .style({
            "font-size": "14px",
            "text-align": "left",
            "padding-left": "1px"
        })
        .html(function(d) {return d.title;});

}

