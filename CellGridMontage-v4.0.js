 IJSetup = function(){
	importClass(Packages.ij.IJ);
	importClass(Packages.ij.plugin.frame.RoiManager);
	importClass(Packages.ij.io.OpenDialog);
	importClass(Packages.ij.io.DirectoryChooser);
	importClass(Packages.ij.gui.GenericDialog);
	importClass(Packages.ij.util.Tools);
	importClass(Packages.ij.plugin.Duplicator);
	importClass(Packages.ij.measure.ResultsTable);
	importClass(Packages.ij.ImagePlus);
	importClass(Packages.ij.process.ImageProcessor);
	importClass(Packages.ij.util.ArrayUtil);
	importClass(Packages.ij.gui.Overlay);
	importClass(Packages.ij.plugin.filter.ParticleAnalyzer);
	importClass(Packages.ij.gui.Roi);
	importClass(Packages.ij.plugin.filter.Analyzer);
	importClass(Packages.ij.plugin.RGBStackMerge);
	importClass(Packages.ij.process.ImageConverter);
	importClass(Packages.ij.gui.OvalRoi);
	importClass(Packages.ij.WindowManager);
	importClass(Packages.ij.ImageStack);
	importClass(Packages.ij.gui.ProfilePlot);
	importClass(Packages.ij.gui.Line);
	importClass(Packages.ij.gui.Plot);
	importClass(Packages.ij.measure.CurveFitter);
	importClass(Packages.ij.plugin.frame.Fitter);
	importClass(Packages.ij.gui.PolygonRoi);
	importClass(Packages.ij.process.ImageStatistics);
	importClass(Packages.ij.measure.Measurements);
	importClass(Packages.java.io.File);
	importClass(Packages.java.io.FilenameFilter);
	importClass(Packages.java.io.IOException);
	importPackage(java.awt);
	importClass(Packages.ij.macro.Interpreter);
	MACRO = new Interpreter(); 
	IJ = IJ(); 
	IJ.setPasteMode("Copy");
	RM = RoiManager(true);// initiating the ROI manager in hidden mode.
	if (RM==null){ IJ.error("ROI Manager is not found"); }
	MACRO.batchMode = true;
}
IJSetup();

function getPercentile(Percentile,pixArr){ // Why are you passing ip, imp and selROI if you are not using them ??? BD
	// This function takes a percentile value, an ROI object, the image processer object,the image plus object and the sorted pixel array.
	// It returns the corresponding grayvalue for the given percentile. If it's 50%, it will return the median gravalue.
    var N = pixArr.length;
	var Arr = new Array;
	for(var i=0; i<pixArr.length; i++){ Arr[i] = pixArr[i]; }
	Arr.sort(function(a,b){ return(a-b) }); 
    var iRank = Math.round((Percentile/100)*(N+1));
    if(Percentile==100){ iRank = N - 1;	}
    return Arr[iRank];
}

function cell() { 
// Constructor for any type of ROI. 
    this.idx    = null;
    this.type   = null;
    this.ROIobj = null; // ImageJ's Roi type object corresponding to this Roi.
    this.area   = null;
    this.x      = null;
    this.y      = null;

    this.toString = function () {
		IJ.log("idx: " + this.idx +" ROIobj: " + this.ROIobj + " , area: " + this.area + " , xVal: " + this.x + " , yVal: " + this.y +" type: " + this.type); 
    }

    this.getAllPercentiles = function(pixArr){
		// This function takes an ROI object, the image processer object, the image plus object and the sorted Roi pixel array.
		// It fills up the cell array fields for the fluorescence bins, from the 100th grayvalue percentile to the 0th percentile.
		this.b0f = getPercentile(100,pixArr); // The brightest pixel
    	this.b1f = getPercentile(90,pixArr);
		this.b2f = getPercentile(80,pixArr);
		this.b3f = getPercentile(70,pixArr);
		this.b4f = getPercentile(60,pixArr);
		this.b5f = getPercentile(50,pixArr); // The median 
		this.b6f = getPercentile(40,pixArr);
		this.b7f = getPercentile(30,pixArr);
		this.b8f = getPercentile(20,pixArr);
		this.b9f = getPercentile(10,pixArr);
		this.b10f = getPercentile(0,pixArr); // The darkest pixel
	}

	// get Pixels In ROI
	// Displays the coordinates and values of the pixels within a non-rectangular ROI.
	this.getpxROI = function(imp,ip){
	  	imp.setRoi(this.ROIobj,false);
	  	ip.setRoi(this.ROIobj);

	  	PX = new MakePixelList();
	
	  	var mask = this.ROIobj!=null?this.ROIobj.getMask():null;
	  	if (mask==null){ IJ.error("Non-rectangular ROI required"); }
	  	var r = this.ROIobj.getBounds();

	  	for (var y=0; y<r.height; y++) {
		  	for (var x=0; x<r.width; x++) {
		   		if (mask.getPixel(x,y)!=0){
					PX.L++;
					PX.X.push(r.x+x);
					PX.Y.push(r.y+y);
	        		PX.I.push(ip.getf(r.x+x,r.y+y));
		   		}
	    	}
		}
		//IJ.log("Number of pixels in ROI : " + PX.L);
		return(PX);
	}

	this.getStats = function(imp,ip){
		imp.setRoi(this.ROIobj, false);
		ip.setRoi(this.ROIobj);
		var stats = ip.getStatistics();
	   	return stats;
	}
	
	this.measureROI = function(imp,ip,strStatsFld) {
	// Performs a measurement on an image. Takes as arguments: The roi object, the imageprocessor object, and the imagestatistics string field telling the function what to measure.
	// It returns the value that was measured.
		imp.setRoi(this.ROIobj,false);
		ip.setRoi(this.ROIobj);
		var stats = ip.getStatistics();
		var val = stats[strStatsFld];
	    return val;
	}
}

function toManager(currentCell){
    // This function takes the current cell object as an argument, and transfers the cell ROI object to the ROI manager.
    RM.addRoi(currentCell.ROIobj);
}

// USEFUL VARIABLES
LETTERS     = new Array("A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P");  // to define 384 plate
COLS        = new Array("01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24");
sharp = '#';
star  = '*';
dash  = '-';
equal = '=';
space = ' ';
FILESEP	= "/"; // change to "\" if using windows I guess

// returns true if the object passed is an integer
function isInt(n){ return Number(n) === n && n % 1 === 0; }
// returns true if the object passed is a float
function isFloat(n){ return Number(n) === n && n % 1 !== 0; }
// returns true if value is numeric and false if it is not.
function isNumeric(value) {
	var RegExp = /^(-)?(\d*)(\.?)(\d*)$/; 
	return String(value).match(RegExp);
}
function isUndefined(value){
    var undefined = void(0); // Obtain `undefined` value (even if undefined was re-assigned)
    return value === undefined;
}
function isEmpty(str) { return str === ''; }
function notEmpty(str) { return str !== ''; }
function isDefinedArray(Arr) {
  for (var i = 0; i < Arr.length; i++) {
    if( isUndefined(Arr[i]) && Arr[i] == null ){ return false; }
  }
  return true;
}
function isNumericArray(Arr) {
  for (var i = 0; i < Arr.length; i++){ return isNumeric(Arr[i]); }
  return true;
}

function addArray(Arr1, Arr2){ 
	if(A.length!==B.length){ throw new Error("Cannot operate arrays of different lengths"); }
	var res = new Array();
	for (var i = 0; i < Arr1.length; i++){ res.push(Arr1[i]+Arr2[i]) }
	return res;
}
function subtractArray(Arr1, Arr2){
	if(Arr1.length!==Arr2.length){ throw new Error("Cannot operate arrays of different lengths"); }
	var res = new Array();
	for (var i = 0; i < Arr1.length; i++){ res.push(Arr1[i]-Arr2[i]) }
	return res;
}
function productArray(Arr1, Arr2){
	if(Arr1.length!==Arr2.length){ throw new Error("Cannot operate arrays of different lengths"); }
	var res = new Array();
	for (var i = 0; i < Arr1.length; i++){ res.push(Arr1[i]*Arr2[i]) }
	return res;
}
function divArray(Arr1, Arr2){
	if(Arr1.length!==Arr2.length){ throw new Error("Cannot operate arrays of different lengths"); }
	var res = new Array();
	for (var i = 0; i < Arr1.length; i++){ res.push(Arr1[i]/Arr2[i]) }
	return res;
}
function sortArr(Arr,asc){
	var sorted = Arr.slice(0);
	if( asc === undefined ){
		// It returns the sorted array in ascending order.
	    sorted.sort(function(a, b){return a-b}); 
	    return sorted;
	}else{
		// It returns the sorted array in descending order.
	    sorted.sort(function(a, b){return b-a}); 
	    return sorted;
	}
}

Object.keys = (function() {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function(obj) {
      if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
 
String.prototype.repeat = function(count) {
    'use strict';
    if (this == null) { throw new TypeError('can\'t convert ' + this + ' to object'); }
    var str = '' + this;
    count = +count;
    if(count != count){ count = 0; }
    if(count < 0){ throw new RangeError('repeat count must be non-negative'); }
    if(count == Infinity){ throw new RangeError('repeat count must be less than infinity'); }
    count = Math.floor(count);
    if(str.length == 0 || count == 0){ return ''; }
    // Ensuring count is a 31-bit integer allows us to heavily optimize the main part. 
    // But anyway, most current (August 2014) browsers can't handle strings 1 << 28 chars or longer, so:
    if(str.length * count >= 1 << 28){ throw new RangeError('repeat count must not overflow maximum string size'); }
    var rpt = '';
    for(;;){
      if ((count & 1) == 1) { rpt += str; }
      count >>>= 1;
      if (count == 0){ break; }
      str += str;
    }
    // Could we try:
    // return Array(count + 1).join(this);
    return rpt;
}


Array.prototype.indexOf = function indexOf(member, startFrom) {
    /*
    In non-strict mode, if the `this` variable is null or undefined, then it is set to the window object.
    Otherwise, `this` is automatically converted to an object. 
    In strict mode, if the `this` variable is null or undefined, a `TypeError` is thrown.
    */
	if (this == null) { throw new TypeError("Array.prototype.indexOf() - can't convert `" + this + "` to object"); }

	var
	  index = isFinite(startFrom) ? Math.floor(startFrom) : 0,
	  that = this instanceof Object ? this : new Object(this),
	  length = isFinite(that.length) ? Math.floor(that.length) : 0;

	if (index >= length){ return -1; }

	if (index < 0) { index = Math.max(length + index, 0); }

	if (member === undefined) {
		/* Since `member` is undefined, keys that don't exist will have the same value as `member`, and thus do need to be checked. */
	  do{
	    if (index in that && that[index] === undefined) { return index; }
	  }while (++index < length);
	}else{
	  do{
	  	if (that[index] === member) { return index; }
	  }while (++index < length);
	}
	return -1;
}

function precision(x, digits){ return parseFloat(x.toFixed(digits)) }
function increment(val,delta){ return(val+delta) }
function seqD(start,end,delta){
	var Arr = new Array();
	if(delta == 0 ){ return(Arr) }
	if( start > end ){ return(Arr) }
	if(delta < 0 ){ delta = -delta; }
	if( delta > end-start ){ delta = end; }
	for (var i = start; i < end+1; i+=delta){ Arr.push(i); }
	return(Arr)
}
//vec = new Array(2,3,5,6,9,17,21,22,23,25,28,29,30,31,33,37,39,41,42,44,45,46,47,48,50,51,54,56,57,62,63,65,66,69,70,72,73,74,75,76,77,78,79,81,86,88,89,90,91,92,93,94,95,102,105,106,107,108,112,113,114,116,117,120,121,122,123,124,125,126,128,129,132,134,135,137,138,141,142,145,146,149,152,155,156,157,158,161,163,167,169,171,172,173,174,175,176,178,179,182,183,184,185,186,188,190,191,193,194,195,197,198,199);
function seqL(start,end,len){
	var Arr = new Array();
	if( len<1 ){ return(Arr) }
	if( start > end ){ return(Arr) }
	if( end < len ){ len = end; }
	var delta = (end-start) / (len-1) ;
	var nval=0;
	for (var i = start; i <= end-delta && nval < len-1; i+=delta){ Arr.push(Math.floor(i)); nval++; }
	Arr.push(Math.floor(end-1));
	return(Arr)
}
//print(vec.length);
//print( seqL(0,vec.length,32) );
//ivec=seqL(0,vec.length,32);
function subset(Arr,ind){
	var subset = new Array();
	for(var i=0; i<ind.length; i++){ 
		if(i<Arr.length){ subset.push(Arr[ind[i]]); }
		else{ IJ.log("index "+ind[i]+" not in Array! "+Arr); }
	}
	return(subset);
}
//print(subset(vec,ivec));

function mapArray(fn,Arr) {
	var Arr2 = new Array();
	for (var i = 0; i < Arr.length; i++){ Arr2.push(fn(Arr[i])); }
	return Arr2;
}

function filter(Arr,val){
	var res = {};
	res['gt']=0;
	res['lt']=0;
	res['eq']=0;
	res['max']=-1;
	res['min']=1000000000;
	for (var i = 0; i < Arr.length; i++){ 
		if( Arr[i] > res['max'] ){ res['max'] = Arr[i]; }
		if( Arr[i] < res['min'] ){ res['min'] = Arr[i]; }
		if( Arr[i] > val ){ res['gt'] += 1;  }
		if( Arr[i] < val ){ res['lt'] += 1;  }
		if( Arr[i] == val ){ res['eq'] += 1; }
	}
	res['ge'] = res['gt'] + res['eq'];
	res['le'] = res['lt'] + res['eq'];
	res['ne'] = Arr.length - res['eq'];
	return(res);
}

function dirname(str, sep){ return str.substr(0,str.lastIndexOf(sep)); }
function basename(str, sep){ return str.substr(str.lastIndexOf(sep) + 1); }
function stripext(str) { return str.substr(0,str.lastIndexOf('.')); }
function getext(str) { return str.substr(str.lastIndexOf('.')+1); }
// path = '/media/elusers/users/benjamin/A-PROJECTS/01_PhD/04-image-analysis/JS4Fiji/test-CellGridMontage.input';
// print("DIR is "+dirname(path,'/'));
// print("FILE is "+basename(path,'/'));
// print("FILENAME is "+stripEXT(basename(path,'/')));
// print("EXTENSION is "+getEXT(path));

function initMontageParams(){
	var M={};
	M['skipFIRSTPIC'] = false;
	M['BITMODE']      = '8-bit';
	M['BACKGROUND']   = 'black';
	M['PICPERWELL']   = 8;
	/// DONT MODIFY UNLESS YOUR PLATE FORMAT IS DIFFERENT FROM 384
	M['PLATEROWS']    = 16;
	M['PLATECOLS']    = 24;
	/// DONT MODIFY UNLESS YOU TO ALLOW FOR BIGGER CELLS, MORE CELLS PER WELLS
	//-- This will increase the size of the image and greatly slow down imageJ when observing the montage --//
	M['pxBORDER']     = 50;  // TOP & LEFT MARGIN IN PIXELS FOR THE MONTAGE
	M['pxCELL']       = 65;  // SIZE IN PIXEL FOR CROPPING CELLS
	M['CELLPERSIDE']  = 15;  // NUMBER OF CELLS PER SIDE OF A WELL

	M['FILENAME'] = "montage";
	return(M);
}

function updateMontageParams(M){

	M['PLATEFORMAT'] = M['PLATEROWS']*M['PLATECOLS'];
	M['CELLPERWELL'] = M['CELLPERSIDE']*M['CELLPERSIDE']; // MAXIMUM NUMBER OF CELLS PER WELL (225)
	M['CELLPERPIC']  = Math.floor( M['CELLPERWELL'] / (M['PICPERWELL']-M['skipFIRSTPIC']) ) + 1; // MAXIMUM NUMBER OF CELLS PER PICTURE
	
	M['WELLSIDE']    = M['CELLPERSIDE']*M['pxCELL'];
	M['WIDTH']       = M['pxBORDER']+(M['PLATECOLS']*M['WELLSIDE']);
	M['HEIGHT']      = M['pxBORDER']+(M['PLATEROWS']*M['WELLSIDE']);

	return(M);
}

function getMontageAllParams(M){
	var sharp = '#';
	var retSTR = "";
	// PRINTING MONTAGE PARAMETERS
	retSTR+=sharp.repeat(80)+"\n";
	retSTR+="YOUR PLATE MONTAGE WILL BE IN FORMAT : "+M['PLATEFORMAT']+" wells ("+M['PLATEROWS']+"rows x "+M['PLATECOLS']+"cols)\n";
	retSTR+="==> in pixel unit : Width = " + M['WIDTH'] + " px.  Height = "+M['HEIGHT']+" px.\n";
	retSTR+="EACH WELL WILL HAVE AT MOST "+M['CELLPERWELL']+" cells ("+M['CELLPERSIDE']+" images by row & by column)\n";
	retSTR+="AT MOST, "+M['CELLPERPIC']+" CELLS WILL BE TAKEN FROM EACH WELL PICTURE\n";
	retSTR+="EACH CELL WILL BE CONTAINED IN A SQUARE IMAGE OF "+M['pxCELL']+" px.\n";
	retSTR+="In addition, borders of "+M['pxBORDER']+" px. will be drawn on the left and top side of the plate\n";
	retSTR+=sharp.repeat(80)+"\n";
	IJ.log(retSTR);
}
//IJ.log("EXAMPLE getMontageAllParam(MONTAGE)");
//getMontageAllParams(MONTAGE);

function getMontageParam(mon,par){
	var retSTR = "";
	if( par in mon ){
		retSTR+="PARAMETER '"+par+"' VALUE = "+mon[par];
	}else{
		retSTR+=("PARAMETER '"+par+"' NOT FOUND!");
	}
	return(retSTR);
}
//IJ.log("EXAMPLE getMontageParam(MONTAGE,'CELLPERPIC')");
//getMontageParam(MONTAGE,"CELLPERPIC");

function setMontageParam(mon,par,val){
	var retSTR = "";
	if( par in mon ){
		//retSTR+="BEFORE : "+getMontageParam(mon,par);
		retSTR+="SETTING "+getMontageParam(mon,par)+" TO "+val+"\n";
		mon[par] = val;
		//retSTR+="AFTER  : "+getMontageParam(mon,par);
		
	}else{
		retSTR +="PARAMETER '"+par+"' NOT FOUND!\n";
	}
	IJ.log(retSTR);
}
//IJ.log("EXAMPLE setMontageParam(MONTAGE,'CELLPERPIC',15)")
//setMontageParam(MONTAGE,"CELLPERPIC",15);

// FUNCTION
function getWellpos(snum,M){
	
	var iWELL=Math.floor(snum/(M['PICPERWELL']));
	var POS = iWELL / M['PLATECOLS'];

	var NROW=Math.floor(POS);
	var ncol = ((POS-Math.floor(POS)) * M['PLATECOLS']);
	var offsetX = Math.pow(-1, (NROW % 2 != 0)) * ncol;
	var originX = ((NROW % 2 != 0) * (M['PLATECOLS']-1)); 
	var NCOL =  Math.round(originX + offsetX);

	var well = {};
	well['irow'] = NROW;
	well['icol'] = NCOL;
	if( NROW % 2 == 0 ){ // Left-to-right on even rows (0,2,4,6... => A,C,E,G..)
	  well['type'] = +1;
	}else if ( NROW % 2 != 0 ){   // Right-to-Left on odd rows (1,3,5,7... => B,D,F,H...)
	  well['type'] = -1;
    }	 	

    var X = M['pxBORDER'] + NCOL * M['WELLSIDE'];
	//IJ.log('NROW '+NROW+' NCOL '+NCOL+' X '+globalX);

	var WELL=""+LETTERS[NROW]+COLS[NCOL]
	var Y = M['pxBORDER'] + NROW * M['WELLSIDE'];
	well['name'] = WELL;
	well['X'] = X;
	well['Y'] = Y;

	return(well);
}
//IJ.log("EXAMPLE getWellpos(1352,MONTAGE)");
//IJ.log(Dumper(getWellpos(1352,MONTAGE)));


function Well2pos(w,M,debug){
	
	var regexWell = new RegExp('^([A-P])(0[1-9]|1[0-9]|2[0-4])$');
	var arrayWell = regexWell.exec(w);

	if( arrayWell === null){ 
		IJ.log(w+" is not a valid well.") 
		return(null);
	}
 	
 	row=LETTERS.indexOf(arrayWell[1]);
	col=COLS.indexOf(arrayWell[2]);
	if( row === null ){	IJ.log(arrayWell[1] + " not a valid ROW in the "+M['PLATEFORMAT']+" well plate.");	}
	if( col ===  null ){ IJ.log(arrayWell[2] + " not a valid COLUMN in the "+M['PLATEFORMAT']+" well plate.");	} 
	
	var wellpos = {};
	wellpos['name'] = w;
	wellpos['row'] = LETTERS[row];
	wellpos['col'] = COLS[col];
	wellpos['x']   = M['pxBORDER'] + col*M['WELLSIDE'];
	wellpos['y']   = M['pxBORDER'] + row*M['WELLSIDE'];

	if( row !== null  & col !== null & debug !== undefined ){
		IJ.log("WELL  string      : "+wellpos['name']);
		IJ.log("Plate coordinates : row = "+row+" ( "+wellpos['row']+" ) "+" col = "+col+" ( "+wellpos['col']+" )");
		IJ.log("Pixel coordinates : x= "+wellpos['x']+" y="+wellpos['y']);
	}
	
	return(wellpos);
}
//IJ.log("EXAMPLE Well2pos('A01',MONTAGE)");
//IJ.log(Dumper(Well2pos("A01",MONTAGE)));

function getSNUM(wROW,wCOL,M){
	var myNUM = (wROW-1) * M['PLATECOLS'] * M['PICPERWELL'];
	if( wROW % 2 == 0 ){ // Left-to-right on even rows (0,2,4,6... => A,C,E,G..)
	  myNUM += (M['PLATECOLS']-wCOL-1)*M['PICPERWELL'] + 1;
	}else if ( wROW % 2 != 0 ){   // Right-to-Left on odd rows (1,3,5,7... => B,D,F,H...)
	  myNUM += (wCOL-1)*M['PICPERWELL'] + 1;
    }	 	
	return(myNUM);
}

function tabRow (idx,P,W,O,C0,C1) {
  this.index = idx;
  this.plate = String(P);
  this.well = String(W);
  this.orf =  String(O);
  this.c0 = File(C0);
  this.c1 = File(C1);
  this.c2 = null;
  this.c3 = null;
}

function tabRow (idx,P,W,O,C0,C1,C2) {
  this.index = idx;
  this.plate = String(P);
  this.well = String(W);
  this.orf =  String(O);
  this.c0 = File(C0);
  this.c1 = File(C1);
  this.c2 = File(C2);
  this.c3 = null;
}

function tabRow (idx,P,W,O,C0,C1,C2,C3) {
  this.index = idx;
  this.plate = String(P);
  this.well = String(W);
  this.orf =  String(O);
  this.c0 = File(C0);
  this.c1 = File(C1);
  this.c2 = File(C2);
  this.c3 = File(C3);
}

tabRow.prototype.toString = function tabRow2String() {
  var ret = 'row=' + this.index + '\n-> plate=' + this.plate + '\n-> well=' + this.well + '\n-> orf=' + this.orf + '\n-> c0=' + this.c0+ '\n-> c1=' + this.c1+ '\n-> c2=' + this.c2+ '\n-> c3=' + this.c3;
  return ret;
}


function openTable(filepath,sep,header){
	var fileContent = IJ.openAsString(filepath);
	var lines = fileContent.split("\n");
	
	var names = seqL(1,lines[0].split(sep).length);
	if(header==true){  names = lines[0].split(sep); }
	var table = new Array();
	IJ.log("Columns of tabulated file are : "+names.join(' ')+' ncol='+names.length);
	for( var n=0+(header==true); n<30; n++){
		columns = lines[n].split(sep);
		record = new tabRow(n,columns[0],columns[1].toString(),columns[2],columns[3],columns[4],columns[5],columns[6]);
//		for( var c=0; c<names.length; c++ ){
//			hash[names[c]] = columns[c]; 
//		}
		table.push(record);
	}
	IJ.log("Tabulated file contained "+(lines.length-header)+" lines with data (except header)");
	return(table);
}
	
//IJ.log("EXAMPLE getSNUM(10,18,MONTAGE)");
//IJ.log(Dumper(getSNUM(10,18,MONTAGE)));

MONTAGE=initMontageParams();
// activate batchmode (= setBatchMode(true) in IJ macro)

///------------------------------------------------USER INPUT------------------------------------------------///
PARAMFILE = "/media/elusers/users/benjamin/A-PROJECTS/01_PhD/04-image-analysis/JS4Fiji/input-for-cell-grid-montage.tsv"; // ARGV[0]
IJ.log('PARAMFILE '+PARAMFILE);
OUTPATH   = "/media/elusers/users/benjamin/A-PROJECTS/01_PhD/04-image-analysis/JS4Fiji/"; // ARGV[1] or dirname(ARGV[0])
IJ.log('OUTPATH '+ OUTPATH);
OUTDIR = dirname(OUTPATH,'/');
IJ.log('OUTDIR '+ OUTDIR);
SCREENNAME = 'test-cellgrid';
INPUT=openTable(PARAMFILE,'\t',true);
//IJ.log('example Row=1');
//row1 = INPUT[0];
//IJ.log(row1.toString());

///INPUT/// FINALLY YOU NEED TO DEFINE THE LUT, WHICH CORRESPONDS TO THE COLORSPACE THAT NEEDS TO BE USED TO REPRESENT INTENSITIES (for example RFP is displayed as red pixels)
LUT=new Array("Grays","Green","Red","Cyan");

///....NOT ACTIVE....///
///INPUT/// YOU NEED TO DEFINE THE PATH FOR THE LIST OF SELECTED CELLS IN EACH PICTURE OF THE PLATE
//SELFILE = "/media/elusers/users/benjamin/A-PROJECTS/01_PhD/04-image-analysis/JS4Fiji/plate_1-SELECTED-CELLID-SNUM.JSON"; // undefined; //path2project + "plate_"+PLATENUM+"/"+PLATENAME+"-SELECTED-CELLID-SNUM.JSON"

		// READ FILE WITH LIST OF SELECTED CELLS IN EACH SEGMENTED IMAGE
		/// var SELECTION  = getCellSelection(SELFILE); ///
/*	
		var SELECTION = seqD(0,STATUS['NCELLS'],1);
		var NOSEL=false;
		if( SELFILE !== undefined && File(SELFILE).exists ){
			IJ.log("(1.b) Filter selected cells for current well");
			// Get Selected ROI number
			if( CELLID === undefined || CELLID[irow] === undefined){
				IJ.log("NO SELECTION OF CELLS !");
				NOSEL=true;
			}else if(CELLID[irow] !== undefined){
				IJ.log("FOUND SELECTION OF CELLS !");
				SELECTION = CELLID[irow];
				NOSEL=false;
				IJ.log("SELECTED CELLS ID (n="+SELECTION.length+") : "+SELECTION);
			}
		}	
		var nsel = SELECTION.length;
*/


/*	    	if( sel !== -1 ){
	    		//IJ.log(" selected i="+sel+" "+SEL[sel]);
	    		//IJ.log(ROInum+" "+test);
	    		//IJ.log("ROInum="+ROInum+" => THIS IS A SELECTED CELL");
	    		KEEP.push(SEL[sel]);
		    	if( Cell.area > minCELLAREA && Cell.area < maxCELLAREA){
		    		CELLS.push(Cell);
		    		nkept++;
		    	}else{
		    		nsmall++;
		    	}
	    	}else{
	    		nextra++;
	    		//IJ.log("ROInum="+ROInum+" => NOT A SELECTED CELL");
	    		CELLS.unshift(Cell);
	    	}
	  	}

	
		ONLYSELECTED = false;
		if( ONLYSELECTED && NOSEL){
			IJ.log("...ONLY SELECTED CELLS...");
			IJ.log("No SELECTED cells in image ...skipping to next image...");
	    	STATUS['picno']++; 
	   		continue;
		}
	
	  	// Get the number of cells and filter selected cells
		var iSEL = seqL(0,STATUS['NCELLS'],MONTAGE['CELLPERPIC']);
		if( NOSEL ){ 
	  		IJ.log("TOTAL NUMBER OF CELLS IN IMAGE : "+STATUS['NCELLS']+" returned overlays ("+nsel+")");
		}else{
	  		IJ.log("TOTAL NUMBER OF CELLS IN IMAGE : "+STATUS['NCELLS']+"  returned overlays | "+nsel+" selected overlays");
			iSEL = seqL(0,nsel,MONTAGE['CELLPERPIC']);
	  	}
		var SEL = subset(SELECTION,iSEL);
	  	IJ.log("KEPT CELLS IDs (n="+SEL.length+") : "+SEL+" (SELECTION = "+!NOSEL+")");
		IJ.log("indexes : "+iSEL);
	
		IJ.log("+++ TOTAL CELL COPIED (so far) : "+STATUS['CELLCOPIED']+" +++");
		STATUS['NCELLS'] += STATUS['NCELLS'] - nsel;
		
	  	// STORE OVERLAYS AS AN ARRAY WITH THEIR x/y COORDINATES ON BF image (and their area)
	  	
	  	var nsmall=0;
	  	var nkept=0;
	  	var nrejected=0;
	  	var nextra=0;
	  	//for( var iov=0; iov < nover; iov++){
	  	//	var ov = OVERLAYS.get(iov);
	  	//	IJ.log("i="+iov+" overlay "+ov);
	  	//}
	  	
	  	
		IJ.log(" --> "+KEEP.length+" selected overlays ["+KEEP.join(", ")+"]");
		IJ.log(" -----> "+nkept+" valid overlays");
		IJ.log(" -----> "+nsmall+" abnormal-sized overlays excluded ( "+maxCELLAREA+" > area > "+minCELLAREA+" px)");	
		//space.repeat(50);
		//IJ.log(" --> "+DROP.length+" rejected overlays ( ["+DROP.join(", ")+"] discarded in selection)");	
	  	STATUS['NCELLS_KEPT'] += nkept;

///....NOT ACTIVE....///
*/

///INPUT/// HERE IS THE OUPTUT DIRECTORY FOR THE MONTAGE IMAGE
var MontageFolder = File(OUTDIR);
if(!MontageFolder.exists()){ 
	IJ.log("====> Output directory does not exist!");
	IJ.log("Creating directory '"+OUTDIR+"'...");
	MontageFolder.mkdir();
}

IMGTYPE     = "8-bit";
name  = SCREENNAME + "_" + IMGTYPE;
MONTAGEtype  = IMGTYPE + " black";
///INPUT/// HERE INDICATE HOW MANY PICTURES WERE TAKEN PER WELL
PICPERWELL  = 8;
///INPUT/// HERE INDICATE HOW MANY PIXELS PER SIDE FOR CROPPING CELLS
CELLSIZE    = 65;
setMontageParam(MONTAGE,"PICPERWELL",PICPERWELL);
setMontageParam(MONTAGE,"CELLPERSIDE",15);
setMontageParam(MONTAGE,"pxCELL",65);
setMontageParam(MONTAGE,"FILENAME",name);
setMontageParam(MONTAGE,"BITMODE",IMGTYPE);
setMontageParam(MONTAGE,"BACKGROUND",'black');
MONTAGE = updateMontageParams(MONTAGE);
IJ.log("Name of the Montage     : "+MONTAGE['FILENAME']);
IJ.log("Montage Image type      : "+MONTAGE['BITMODE']);
IJ.log("Montage Width           : "+MONTAGE['WIDTH']);
IJ.log("Montage Height          : "+MONTAGE['HEIGHT']);

///------------------------------------------------END OF USER INPUT------------------------------------------------///

minCELLAREA = 500;
maxCELLAREA = 3500;

function initRM(){
	if(RM==null){ RM = RoiManager(); }
	RM.reset();
}

function initCopyStatus(x0,y0){
	var status = {};
	status['LASTROW'] = false;
	status['picno'] = 1;
	status['Xpos'] = x0;
	status['Ypos'] = y0;
	status['well'] = "";
	status['orf'] = "";
	status['NCELLS'] = 0;
	status['KEPT']   = 0;
	status['COPIED'] = 0;
	status['xcellgrid']  = 0;
	status['ycellgrid']  = 0;
	status['MAXINT'] = 0;
	status['COPY']   = true;
	return(status);
}


function NextWell(lastVal, currentVal,M,S,O){
	// CHECK IF WELL HAS BEEN VISITED
	
	IJ.log("(0) Check if well changed");
	var nextwell = (lastVal !== currentVal);
	if( nextwell ){
		IJ.log(dash.repeat(100));
		IJ.log("== Next well "+nextwell+" == ");
		IJ.log("Previous well #"+lastVal+"#");
		IJ.log("Current well #"+currentVal+"#");
		var W = Well2pos(currentVal,M,true);
		IJ.log(dash.repeat(100));

		S['picno'] = 1;
		S['Xpos']  = W['x'];
		S['Ypos']  = W['y'];
		S['well']  = W['name'];
		S['orf']  = O;
		
		S['TOTALCELLS'] = 0;
		S['NCELLS']     = 0;
		S['NKEEP']      = 0;
		S['CELLCOPIED'] = 0; 
		S['NDROP']      = 0;

		S['xcellgrid']  = 0;
		S['ycellgrid']  = 0;
		nextwell=false;
	}
}

function Overlay2Cells(overlays, imp, ip){ 
	var cells = new Array();
	for( var iroi=0; iroi < overlays.size(); iroi++){
		ROI = overlays.get(iroi);
		if( ROI == null ){ IJ.log("THIS OVERLAY (num="+(iroi)+") DOES NOT EXISTS !"); continue; }
		var Cell = new cell();
		Cell.type = "cell";
		Cell.ROIobj = ROI; 
		Cell.idx = iroi;
		Cell.area = Cell.measureROI(imp,ip,"area");
		Cell.x = Cell.measureROI(imp,ip,"xCenterOfMass");
		Cell.y = Cell.measureROI(imp,ip,"yCenterOfMass");
		cells.push(Cell);
	}
 	return(cells);
}

function getImageSegmented(segIMG){
	IJ.log("(1.a) Open segmented image");
	var cellimp = null;
	var msg =  "Path to image with segmented cells : " + segIMG;
	if( !segIMG.exists() ){ 
		IJ.log(msg +" [FILE NOT FOUND]"); 
	}
	var cellimp = IJ.openImage(segIMG);
	return(cellimp);
}

function getCells(imp){
	IJ.log("(1.b) Retrieve overlays in segmented image and convert to cell ROIs");
	var cells = new Array();
	var ip = imp.getProcessor();
	var overlays = imp.getOverlay(); // Get the cell overlays from the image with segmented cells
	imp.show();
  	if( overlays != null ){ cells = Overlay2Cells(overlays,imp,ip); }
	imp.close();
	return(cells);
}

function getCellSelection(selfile,S){
	if(File(selfile).exists()){
		var fileContent = IJ.openAsString(selfile);
		var lines = fileContent.split("\n");
	}else{
		IJ.log("NO PRESELECTION OF CELLS");
	}
}

function makeCellGrid(GRID,IMG,C,M,S){
	IJ.log("(3) Crop and tile cells from current well image to cell grid");
	var wellLABELS = new Overlay();
	var cellLABELS = new Overlay();	

	// START COPYING CELLS IN CURRENT CHANNEL
	if( S['COPY'] && S['CELLCOPIED'] < M['CELLPERWELL'] && S['picno'] <= M['PICPERWELL'] ){
	  	IMP = IJ.openImage(IMG);
	  	IMP.show();
		IJ.run(IMP, "Gaussian Blur...", "sigma=1.00");
		IJ.run(IMP, "Subtract Background...", "rolling=50");
	  	IJ.run(IMP, "Enhance Contrast", "saturated=0.35");
	  	IP = IMP.getProcessor();

  		for( icell=0; icell < C.length && S['COPY'] && S['CELLCOPIED'] < M['CELLPERWELL']; icell++){
		  	//IJ.log("SELECTED CELL INDEX IN PIC "+ipic+" : "+indCellPIC+" (nCells = "+nover+" kept="+nkept+" arrayL = "+CELLS.length+")");
		  	var stats = C[icell].getStats(IMP,IP);
		  	if(stats.max > S['MAXINT']){  S['MAXINT']=stats.max; }

			var localX = S['xcellgrid']*M['pxCELL'];
			var localY = S['ycellgrid']*M['pxCELL'];

			// COPY CELL ROI FROM WELL PICTURE
			IJ.selectWindow(IMP.getTitle());
			IJ.makeRectangle(Math.floor(C[icell].x-M['pxCELL']/2), Math.floor(C[icell].y-M['pxCELL']/2), M['pxCELL'], M['pxCELL']);
			IJ.run(IMP,"Copy","");

			// #### PASTE TO MONTAGE 8-BIT IMAGE (THROUGH TEMPORARY 8-BIT IMAGE)  ####
			// CREATE A TEMPORARY IMAGE OF CELL SIZE
			TMP = IJ.createImage("TMP_CELL",M['BITMODE'],M['pxCELL']+1,M['pxCELL']+1,1);
			TMP.show();
			// PASTE THE CELL IN THE TEMPORARY 8-bits IMAGE
			IJ.selectWindow("TMP_CELL");
			tmpROI = new Roi(1,1,M['pxCELL'],M['pxCELL']);
			TMP.setRoi( tmpROI );
			IJ.run(TMP,"Paste","");
			
			// COPY THE TMP CELL IMAGE FROM 8bits
			IJ.run(TMP,"Copy","");
			TMP.changes = false; // No "save changes" dialog
			TMP.close();

			// PASTE IT TO ROI ON GRID
			IJ.selectWindow(GRID.getTitle());
			cellROI = new Roi(localX, localY, M['pxCELL'], M['pxCELL']);
			if( icell == C.length-1 ){
				cellROI.setStrokeWidth(0.2);
				cellROI.setStrokeColor(Color.blue);
			}else{
				cellROI.setStrokeWidth(0.1);
				cellROI.setStrokeColor(Color.gray);
			}
			cellROI.setName(C[icell].idx);
			RM.addRoi(cellROI);
			//cellLABELS.add(cellROI,C[icell].idx); // CELL LABEL
			//cellLABELS.setLabelColor(Color.white);
			//IJ.run("To ROI Manager", "");
			GRID.setRoi(cellROI);
			IJ.run(GRID,"Paste","");
			S['xcellgrid']++;
			if(S['xcellgrid'] == M['CELLPERSIDE']){
				S['xcellgrid']=0;
				S['ycellgrid']++;	
			}
			S['CELLCOPIED']++;
		}
	    IMP.changes=false;
	    IMP.close();
  	}

  	if( S['picno'] == M['PICPERWELL'] || S['LASTROW']){
		IJ.selectWindow(GRID.getTitle());
		IJ.log("====> ADD WELL LABEL <====");
		IJ.log("WELL "+S['well']+" PLATE COORDINATES X="+S['Xpos']+" Y="+S['Ypos']+" ( PICNUM "+S['picno']+")");
		IJ.log("TOTAL CELLS = "+S['TOTALCELLS']+" (COPIED="+S['CELLCOPIED']+")");
		wellROI = new Roi(0,0,M['WELLSIDE'],M['WELLSIDE']);
		wellROI.setStrokeWidth(2);
		wellROI.setStrokeColor(Color.yellow);
  		wellROI.setName(S['well']+"_"+S['orf']);
  		RM.addRoi(wellROI);
  		//wellLABELS.add(wellROI,S['well']+"_"+S['orf']); //WELL LABEL (8bits)
		//wellLABELS.setLabelColor(Color.yellow);
		//IJ.run("To ROI Manager", "");
		RM.moveRoisToOverlay(GRID);
		IJ.run("Show Overlay", "");
		IJ.run("Labels...", "font=18 show use bold");
	 	IJ.saveAs(GRID, "Tiff", OUTDIR + '/' + GRID.getTitle());
		GRID.changes = false;
		GRID.close();
	}
}


IJ.run("Close All", "");
initRM();
getMontageAllParams(MONTAGE); // PRINTING MONTAGE PARAMETERS
var STATUS = initCopyStatus(MONTAGE['pxBORDER'],MONTAGE['pxBORDER']);
for(var irow=0; irow<INPUT.length; irow++){
	STATUS['LASTROW'] = (irow == INPUT.length-1);
	IJ.log("PICNUM = "+STATUS['picno']+" => PLATE "+INPUT[irow]['plate']+" WELL "+INPUT[irow]['well']+" ORF "+INPUT[irow]['orf']);
	if(MONTAGE['skipFirstPIC']){ IJ.log("...SKIPPING THE FIRST PICTURE OF THE WELL..."); STATUS['picno']++; continue; }
	// CHECK IF WELL HAS BEEN VISITED
	NextWell(STATUS['well'], INPUT[irow]['well'], MONTAGE,STATUS,INPUT[irow]['orf']);
	IJ.log("(1) Get detected cells in segmented image from (channel c0)");
	// READ IMAGE FILE WITH SEGMENTED CELLS
	var SEG = getImageSegmented(INPUT[irow]['c0']);
	if( SEG == null ){ STATUS['picno']++; continue; }
	// RETRIEVE SEGMENTED CELLS
	var CELLS = getCells(SEG);
	STATUS['NCELLS'] = CELLS.length;
	IJ.log("=> Number of cells detected in segmented image : "+STATUS['NCELLS']);
	if( CELLS.length == 0 ){ STATUS['COPY'] == false;  STATUS['picno']++;  continue; }
	else{ STATUS['COPY'] = true; }
	STATUS['NKEEP'] = STATUS['NCELLS'] - STATUS['NDROP'];
	STATUS['TOTALCELLS'] += STATUS['NKEEP'];
	// FILTER SEGMENTED CELLS
  	var KEEP  = new Array();
  	var DROP  = new Array();

	var ich=0;
	var ch = 'c'+ich;
	//for(var ich=0; ich<INPUT.length; ich++){

	var t0 = new Date().getTime();
	var nlab=0; 
	
	// CREATE A LARGE BLANK IMAGE FOR THE MONTAGE WITH A NAME BASED ON PLATE NUM AND CHANEL CHOOSED
	//var MONTAGEimp=IJ.createImage(MONTAGE['FILENAME'],MONTAGE['BITMODE']+" "+MONTAGE['BACKGROUND'],MONTAGE['WIDTH'],MONTAGE['HEIGHT'],1);	
	//IJ.log("Show Montage window");
	//MONTAGEimp.show();
	var IMG = INPUT[irow][ch];
	if(	!IMG.exists ){ IJ.log("IMAGE FROM CHANNEL "+IMG+" IS MISSING"); ipic++; continue; }
	if( STATUS['picno'] == 1){
		initRM(RM);
		var WELLname = INPUT[irow]['orf']+"_"+INPUT[irow]['plate']+'_'+INPUT[irow]['well']+"_"+ch;
		var WELLimp=IJ.createImage(WELLname,MONTAGE['BITMODE']+" "+MONTAGE['BACKGROUND'],MONTAGE['WELLSIDE'],MONTAGE['WELLSIDE'],1);	
		IJ.run(WELLimp, LUT[ich], "");
		
		WELLimp.show();
	}
	makeCellGrid(WELLimp, IMG, CELLS, MONTAGE, STATUS);
	
	while(CELLS.length > 0 ){ CELLS.pop(); }
	while(KEEP.length > 0  ){ KEEP.pop();  }
	while(DROP.length > 0  ){ DROP.pop();  }
	IJ.log("NCELLS="+STATUS['NCELLS']+" KEPT="+STATUS['NKEEP'] + " DROPPED="+STATUS['NDROP']);
	STATUS['picno']++;
	IJ.log(space.repeat(100));
}



// 	}
	
// 	IJ.log(space.repeat(100));
// 	IJ.log("MAX INTENSITY IN PLATE : "+STATUS['MAXINT']);
// 	IJ.setMinAndMax(MONTAGEimp, 0, STATUS['MAXINT']);
// 	IJ.log(dash.repeat(100));
// 	IJ.log("(5) Draw the border of the plate montage and save as TIFF");
// 	colname=nlab;
// 	for (var NCOL=0; NCOL < MONTAGE['PLATECOLS'] ; NCOL++){
// 		IJ.selectWindow(MONTAGE['FILENAME']);
// 		rowROI = new Roi(NCOL*MONTAGE['WELLSIDE']+MONTAGE['pxBORDER'],0,MONTAGE['WELLSIDE'],MONTAGE['pxBORDER']);
// 		rowROI.setStrokeWidth(2);
// 		rowROI.setStrokeColor(Color.yellow);
// 		wellLABELS.add(rowROI,COLS[NCOL]); // ROW LABELS (8bits)
// 		colname++;
// 	}
	
// 	rowname=colname;
// 	for (var NROW=0 ; NROW < MONTAGE['PLATEROWS'] ; NROW++){
// 		IJ.selectWindow(MONTAGE['FILENAME']);
// 		colROI = new Roi(0,NROW*MONTAGE['WELLSIDE']+MONTAGE['pxBORDER'],MONTAGE['pxBORDER'],MONTAGE['WELLSIDE']);
// 		colROI.setStrokeWidth(2);
// 		colROI.setStrokeColor(Color.yellow);
// 		wellLABELS.add(colROI,LETTERS[NROW]); // COLUMN LABELS (8bits)
// 		rowname++;
// 	}
// 	IJ.log(dash.repeat(100));
// 	IJ.run(MONTAGEimp, LUT[ich], "");
// 	IJ.log("This channel uses the color scheme : "+LUT[ich]);
// 	MONTAGEimp.setOverlay(wellLABELS);
// 	IJ.run("To ROI Manager", "");
// 	IJ.run("Show Overlay", "");
// 	IJ.run("Labels...", "color=white font=18 show use bold");
	
// 	IJ.log("Saving the plate montage at : "+OUTDIR + "/" + MONTAGE['FILENAME'] );
// 	IJ.saveAs(MONTAGEimp, "Tiff", OUTDIR + '/' + MONTAGE['FILENAME']);

// 	RM.reset();
// 	MONTAGEimp.close();

// 	IJ.log(star.repeat(100));
// 	var t5=new Date().getTime();
// 	IJ.log("TOTAL TIME TAKEN FROM WELL " + INPUT[0]['well'] + " TO WELL " + INPUT[INPUT.length-1]['well'] + " : " + Math.round((t5-t0)/1000) + " sec " );
// 	IJ.log(space.repeat(100));
// 	IJ.log(space.repeat(100));
// // END OF PROCESSING MUTLIPLE CHANELS
// IJ.run("Close All", "");