WARDS = {}   // General variable for ward objects
CSVTAB = {}  // General variable for csvtab object
QUESTION = {}  // General variable for question object

var width = 500,
	height = 500;
 
var projection = d3.geoAlbers()
	.scale(160000)
	.rotate([0,0])
	.center([-1.49, 52.39])
	.translate([width/2,height/2.3]);
 
var geoPath = d3.geoPath()
	.projection(projection);

var tooltip = d3.select("body")
	.append('div')
	.attr('class', 'hidden tooltip');

var leftselect = d3.select('#leftpanel select')
	.on('change', function(d){
		menuchange("left");
	});

var centerselect = d3.select('#centerpanel select')
	.on('change', function(d){
		menuchange("center");
	});

var rightselect = d3.select('#rightpanel select')
	.on('change', function(d){
		menuchange("right");
	});

d3.select('#leftlowerpanel select')
	.on('change', function(d){
		menuchange("leftlower");
	});

d3.select('#rightlowerpanel select')
	.on('change', function(d){
		menuchange("rightlower");
	});
	

function menuchange(side) {
				
	var values = d3.select("#" + side + "panel select").property('value');
	csvpath = './Data/Tables/'.concat(values, '.csv');
	questionpath = './Data/Questions/'.concat(values, '.txt');
				
	// Remove previous question and checkboxes
	d3.select("#" + side + "panel .question").selectAll("*").remove();
	d3.select("#" + side + "panel .answers").selectAll("*").remove();
	
	// Loading data in this way prevents from ploting anything before loading finishes
	d3.queue()
		.defer(d3.json, './Map/cov.topojson')
		.defer(d3.csv, csvpath)
		.defer(d3.text, questionpath)
		.await(function(error, wards, csvtab, questiontext){
			if (error) throw error;
	
			// Assigning values to general variables, otherwise updating doesn't work
			WARDS = wards;
			CSVTAB[side] = csvtab;
			QUESTION[side] = questiontext;
			
			/* Appends Questions */
			d3.select("#" + side + "panel .question")
				.append("div")
				//.attr("class", "questpan")
				.text(QUESTION[side]);
			
			/* Adds the answers */

			var answers = d3.keys(CSVTAB[side][0]); // Get the column names of csv
			answers.remove('name', true); // Remove the element "name"
			answers.remove('code', true); // Remove the element "code"
			
			/* Adds Checkboxes */
			
			answers.forEach(function(d,i) {
				// Append the checkboxes
				d3.select("#" + side + "panel .answers")
					.append("div")
						.attr("class", "checkbox")
					.append("label")
						.attr('for', side + "answer" + i)
						.text(d)
					.append("input")
						.lower()
						.attr("id", side + "answer" + i)
						.attr("type", "checkbox")
						.attr("class", "mapCheckbox flat")
						.attr("value", d)
					.on("change", function(d){ 
						CheckboxUpdate(WARDS, CSVTAB[side], side);
						if( side == "rightlower" || side == "leftlower" ) {
							plotscatterplot();
						}
					});

			});

			plotmapnull(WARDS, side); // Plots the initial null map in the left
	
		});

};

// Function that move object to front in order to avoid plotting border issues
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
	this.parentNode.appendChild(this);
  });
};

// Function for removing specific string from array of strings
Array.prototype.remove= function(){
	var what, a= arguments, L= a.length, ax;
	while(L && this.length){
		what= a[--L];
		while((ax= this.indexOf(what))!= -1){
			this.splice(ax, 1);
		}
	}
	return this;
}

// Plots the map
function plotmap(patches, values, legendtext, side) {
	
	d3.select("#" + side + "panel .map").selectAll("*").remove();  // Remove previous objects
	
	var svgelement = d3.select("#" + side + "panel .map")
		.append('svg')
		.attr('class', 'map');
	
	/* Domain and Colors */
	
	var arr = Object.keys(values).map(function (key) { return values[key]; });
	var minval = Math.min.apply(null, arr);
	var maxval = Math.max.apply(null, arr);
	
	var xScale = d3.scaleLinear()
		.domain([minval, maxval])
		.rangeRound([600, 900]);
		
	var delta = (maxval - minval) / 5.0; // toFixed() for rounding it to int
	
	var domainArray = new Array();
	for (i = minval + delta; i <= maxval; i+=delta){
		domainArray.push(Number(i.toFixed(1)));
	}

	var color = d3.scaleThreshold()
		.domain(domainArray)
		.range(["#ffffcc", "#a1dab4", "#41b6c4", "#2c7fb8", "#253494"]);
		//.range(["#ffffcc", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"]);
		//.range(["#ffffd9", "#edf8b1", "#c7e9b4", "#7fcdbb", "#41b6c4", "#1d91c0", "#225ea8", "#0c2c84"]);
	
	/* Map */
	
	svgelement.append("g")
		.selectAll("path")
		.data(topojson.feature(patches, patches.objects.covwards).features)
		.enter()
		.append("path")
		.attr( "d", geoPath )
		.attr("class","incident")
		.attr("id", function(d) {return d.properties.code})
		.style("fill", function(d) {
			return color(values[d.properties.code]); // get rate value for property matching data ID
			// pass rate value to color function, return color based on domain and range
		})
		.on('mouseover', function(d){
			d3.select(this).moveToFront().attr("class","hover");
			d3.select("#scatterplot").select("#" + d.properties.code).attr("class","hover");
		})
		.on('mousemove', function(d){
			tooltip.classed('hidden', false)
				.attr('style', 'left:' + (d3.event.pageX + 30) +  'px; top:' + (d3.event.pageY - 30) + 'px')
				.html(d.properties.name + ': ' + Number(values[d.properties.code].toFixed(1)));                    
		})
		.on('mouseout', function(d){
			tooltip.classed('hidden', true);
			d3.select(this).attr("class","incident");
			d3.select("#scatterplot").select("#" + d.properties.code).attr("class","incident");
		});
		
		/* Legend */
		
		svgelement.append("g")
			.attr("class", "key")
			.attr("transform", "translate(-550,310)")
			.selectAll("rect")
			.data(color.range().map(function(d) {
				d = color.invertExtent(d);
				if (d[0] == null) d[0] = xScale.domain()[0];
				if (d[1] == null) d[1] = xScale.domain()[1];
				return d;
			}))
			.enter().append("rect")
			.attr("height", 8)
			.attr("x", function(d) { return xScale(d[0]); })
			.attr("width", function(d) { return xScale(d[1]) - xScale(d[0]); })
			.attr("fill", function(d) { return color(d[0]); })
			.attr("opacity", "0.7");
			
		svgelement.append("g")
			.attr("class", "key")
			.attr("transform", "translate(-550,310)")
			.append("text")
			.attr("class", "caption")
			.attr("x", xScale.range()[0])
			.attr("y", -6)
			.attr("fill", "#000")
			.attr("text-anchor", "start")
			.attr("font-weight", "bold")
			.attr("font-family", "Helvetica")
			.text(legendtext);

		svgelement.append("g")
			.attr("class", "key")
			.attr("transform", "translate(-550,310)")
			.call(d3.axisBottom(xScale)
			.tickSize(13)
			.tickFormat(function(xScale, i) { return i ? xScale : xScale; })
			.tickValues(color.domain()))
			.select(".domain")
			.remove();
}

// Plots the map if there is no choice selected
function plotmapnull(patches, side) {
	
	d3.select("#" + side + "panel .map").selectAll("*").remove();  // Remove previous objects
	
	var svgelement = d3.select("#" + side + "panel .map")
		.append('svg')
		.attr('class', 'map');
	
	/* Map */
	
	svgelement.append("g")
		.selectAll("path")
		.data(topojson.feature(patches, patches.objects.covwards).features)
		.enter()
		.append("path")
		.attr("d", geoPath)
		.attr("class","incident")
		.style("fill", "#e5e5e5")
		.on('mouseover', function(d){
			d3.select(this)
				.moveToFront()
				.style("fill","steelblue");
		})
		.on('mousemove', function(d){
			tooltip.classed('hidden', false)
				.attr('style', 'left:' + (d3.event.pageX + 10) +  'px; top:' + (d3.event.pageY - 50) + 'px')
				.html(d.properties.name);                    
		})
		.on('mouseout', function(d){
			d3.select(this)
				.attr("class","incident")
				.style("fill", "#e5e5e5");
			
			tooltip.classed('hidden', true);
		});
}

// Updates the map according to checked boxes
function CheckboxUpdate(wards, data, side){

	var paneltoplot = "#" + side + "panel map";
	var valuestoplot = computevalues(data,side);
	
	if (Object.keys(valuestoplot).length == 0)
	{
		plotmapnull(wards, side); // Plots the map again
	}
	else
	{                
		plotmap(wards, valuestoplot, "Percentage", side); // Plots the map again
	}
}

// Looks which checkboxes are selected and returns the corresponding data
function computevalues(data, side){
	
	var paneltolook = "#" + side + "panel";
	
	var choices = [];
	
	d3.select(paneltolook)
		.selectAll(".mapCheckbox")
		.each(function(d){
			cb = d3.select(this);
			if(cb.property("checked")){
				choices.push(cb.property("value"));
		}
	});
	
	var valuestoplot = {};  
		
	data.forEach(function(d) {
		choices.forEach(function(c) {
			var k = d.code;
			if (k in valuestoplot) {
				valuestoplot[k] += Number(d[c]);
			} else {
				valuestoplot[k] = Number(d[c]);
			}
		});
	});
	
	return(valuestoplot);
}

// Plots the scatter plot
function plotscatterplot(){
	
	d3.select("#scatterplot").selectAll("*").remove();  // Remove previous objects
	d3.select("#analysisbox").selectAll("*").remove();
	
	if(Object.keys(CSVTAB).length == 2)
	{
		
		var margin = {top: 20, right: 20, bottom: 50, left: 60},
			width = 400 - margin.left - margin.right,
			height = 300 - margin.top - margin.bottom;
		
		var svg = d3.select("#scatterplot")
			.append("svg")
			.attr("width", width + margin.left + margin.right)
			.attr("height", height + margin.top + margin.bottom)
			.append("g")
			.attr("id", "plotcanvas")
			.attr("height", height)
			.attr("width", width)
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

		var leftvalues = computevalues(CSVTAB["leftlower"],"leftlower");
		var rightvalues = computevalues(CSVTAB["rightlower"],"rightlower");
					
		if(Object.keys(leftvalues).length > 0 && Object.keys(rightvalues).length > 0){
		
			var x=[],
				y=[];
			
			var names = {}
			
			CSVTAB["leftlower"].forEach(function(d){ names[d.code] = d.name });
			
			var keys = Object.keys(leftvalues);
			keys.forEach(function(key){
				x.push(leftvalues[key])
				y.push(rightvalues[key])
			});
			
			// set the ranges
			var xscale = d3.scaleLinear().range([0, width]);
			var yscale = d3.scaleLinear().range([height, 0]);
			
			// Scale the range of the data
			xscale.domain(d3.extent(x, function(d) { return d; })).nice();
			yscale.domain(d3.extent(y, function(d) { return d; })).nice();

			// Add the scatterplot
			svg.selectAll("dot")
				.data(d3.zip(Object.keys(leftvalues),x,y))
				.enter()
				.append("circle")
				.attr("r", 5)
				.attr("class", "incident")
				.attr("id", function(d) {return d[0]})
				.attr("fill", "steelblue")
				.attr("cx", function(d) { return xscale(d[1]); })
				.attr("cy", function(d) { return yscale(d[2]); })
				.on('mouseover', function(d){
					tooltip.classed('hidden', false)
						.attr('style', 'left:' + (d3.event.pageX + 5) +  'px; top:' + (d3.event.pageY - 40) + 'px')
						.html(names[d[0]]);
					d3.select(this).attr("class","hover");
					d3.selectAll("#" + d[0]).moveToFront().attr("class","hover");
					
					var cx = Number(d3.select(this).attr("cx"));
					var cy = Number(d3.select(this).attr("cy"));
					var cr = Number(d3.select(this).attr("r"));
					
					// Add x gridline
					svg.append("line")
						.attr("class", "gridline")
						.attr("x1", cx - cr)
						.attr("y1", cy)
						.attr("x2", 0)
						.attr("y2", cy);
					
					// Add y gridline
					svg.append("line")
						.attr("class", "gridline")
						.attr("x1", cx)
						.attr("y1", cy + cr)
						.attr("x2", cx)
						.attr("y2", height);
				})
				.on('mouseout', function(d){
					tooltip.classed('hidden', true);
					d3.select(this).attr("class","incident");
					d3.selectAll("#" + d[0]).moveToFront().attr("class","incident");
					
					svg.selectAll(".gridline").remove();
				});

			// Add the X Axis
			svg.append("g")
				.attr("transform", "translate(0," + height + ")")
				.call(d3.axisBottom(xscale));
			
			// text label for the x axis
			svg.append("text")
				.attr("class", "plotlabels")            
				.attr("transform", "translate(" + (width/2) + " ," + 
								   (height + margin.top + 20) + ")")
				.style("text-anchor", "middle")
				.text("Variable X (Left Map)");

			// Add the Y Axis
			svg.append("g")
				.call(d3.axisLeft(yscale));
			
			// text label for the y axis
			svg.append("text")
				.attr("class", "plotlabels")
				.attr("transform", "rotate(-90)")
				.attr("y", 0 - margin.left )
				.attr("x",0 - (height / 2))
				.attr("dy", "1em")
				.style("text-anchor", "middle")
				.text("Variable Y (Right Map)");

			generate_analysisbox(xscale, yscale, leftvalues, rightvalues);
			
		}
	}
}

// Generates the content for the analysis box
function generate_analysisbox(xscale, yscale, leftvalues, rightvalues) {
	
	// Add text
	var abtext = d3.select("#analysisbox")
		.append("div")
		.style("width", "400px")
		.text("Click the button to perform a linear regression test:");
	
	// Add button to perform linear regression
	var lrButton = d3.select("#analysisbox")
		.append("button")
		.text("Run")
		.attr("id", "lrButton")
		.style("height", "60px")
		.style("width", "70px")
		.style("margin-top", "15px")
		.on('click', function(){
			plotTrendLine(xscale, yscale, leftvalues, rightvalues);
			
			d3.select(this).attr('disabled','disabled');
		});

	// Add results
	var abparams = d3.select("#analysisbox")
		.append("div")
		.attr("id", "abparams");
		
	// Add results
	var abres = d3.select("#analysisbox")
		.append("div")
		.attr("id", "abres")
		.style("width", "400px");
}

//Plot the trendline
function plotTrendLine(xscale, yscale, leftvalues, rightvalues){
	
	var ls = leastSquares(d3.values(leftvalues), d3.values(rightvalues))
			
	var vmax = d3.max(d3.values(leftvalues));
	var vmin = d3.min(d3.values(leftvalues));

	var line = d3.select("#plotcanvas")
		.append("svg:line")
		.attr("class", "trendline")
		.attr("x1", xscale(vmin))
		.attr("y1", yscale((vmin * ls.slope) + ls.intercept ))
		.attr("x2", xscale(vmin))
		.attr("y2", yscale((vmin * ls.slope) + ls.intercept ))
		.on('mouseover', function(d){
			d3.select(this).attr("class", "trendlinehover");
		})
		//.on('mousemove', function(d){
		//  tooltip.classed('hidden', false)
		//      .attr('style', 'left:' + (d3.event.pageX + 10) +  'px; top:' + (d3.event.pageY - 0) + 'px')
		//      .html('Slope: ' + ls.slope.toFixed(4) + '<br/>' + 'Intercept: ' + ls.intercept.toFixed(4) + '<br/>' + 'R^2: ' + ls.r2.toFixed(4));
		//        
		//})
		.on('mouseout', function(d){
			tooltip.classed('hidden', true);
			d3.select(this).attr("class", "trendline");
		})
		.transition()
		.duration(1500)
		.attr("x2", xscale(vmax))
		.attr("y2", yscale( (vmax * ls.slope) + ls.intercept ));

		console.log( line );
		
	d3.select("#abparams")
		.append("div")
		.html('Slope: ' + ls.slope.toFixed(4) + '<br/>' + 'Intercept: ' + ls.intercept.toFixed(4) + '<br/>' + 'R^2: ' + ls.r2.toFixed(4));
		
	d3.select("#abres")
		.append("div")
		.style("font-size", "24px")
		.style("text-align", "center")
		.html(function(d){
			if (ls.r2 > 0.70 && ls.slope > 0) {
				return 'Correlation is strongly positive';
			} else if (ls.r2 > 0.70 && ls.slope < 0) {
				return 'Correlation is strongly negative';
			} else if (ls.r2 > 0.50 && ls.r2 < 0.70 && ls.slope > 0) {
				return 'Correlation is moderately positive';
			} else if (ls.r2 > 0.50 && ls.r2 < 0.70 && ls.slope < 0) {
				return 'Correlation is moderately negative';
			} else if (ls.r2 > 0.30 && ls.r2 < 0.50 && ls.slope > 0) {
				return 'Correlation is weakly positive'
			} else if (ls.r2 > 0.30 && ls.r2 < 0.50 && ls.slope < 0) {
				return 'Correlation is weakly negative'
			} else {
				return 'There is no correlation';
			}
		});
}        

// returns slope, intercept and r-square of the line
//Pulled from http://bl.ocks.org/benvandyke/8459843
function leastSquares(xSeries, ySeries) {
	var reduceSumFunc = function(prev, cur) { return prev + cur; };

	var xBar = xSeries.reduce(reduceSumFunc) * 1.0 / xSeries.length;
	var yBar = ySeries.reduce(reduceSumFunc) * 1.0 / ySeries.length;

	var ssXX = xSeries.map(function(d) { return Math.pow(d - xBar, 2); })
	.reduce(reduceSumFunc);

	var ssYY = ySeries.map(function(d) { return Math.pow(d - yBar, 2); })
	.reduce(reduceSumFunc);

	var ssXY = xSeries.map(function(d, i) { return (d - xBar) * (ySeries[i] - yBar); })
	.reduce(reduceSumFunc);
	
	var res = {};
	res['slope'] = ssXY / ssXX;
	res['intercept'] = yBar - (xBar * res.slope);
	res['r2'] = Math.pow(ssXY, 2) / (ssXX * ssYY);

	return res;
}