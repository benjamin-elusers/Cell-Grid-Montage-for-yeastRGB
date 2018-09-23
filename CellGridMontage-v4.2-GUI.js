// @String(label="Input tabular file",value="/media/elusers/users/benjamin/A-PROJECTS/01_PhD/04-image-analysis/JS4Fiji/input-for-cell-grid-montage.tsv") inputfile
// @String(label="Output directory",value="/media/elusers/users/benjamin/A-PROJECTS/01_PhD/04-image-analysis/JS4Fiji/") outdir
// @String(label="Screen name",value="test-cellgrid") screenname
// @Integer(label="Grid side length [in cells] ?",value=15) gridside
// @Integer(label="Cell size [in px] ?",value=65) cellsize
// @Integer(label="Pictures per well ?",value=8) picperwell
// @Integer(label="Field delimiter [1=tab | 2=comma]?",value=1,min=1,max=2) delim
// @Integer(label="Path component separator [1=unix | 2=windows]?",value=1,min=1,max=2) fsep
// @Integer(label="Bitmode [1=8bit | 2=16bit]?",value=1,min=1,max=2) bitmode
/* Author  : Benjamin Dubreuil
 * Date    : 23 Sept. 2018 
 * Project : YeastRGB - Cell Grid Montage (v4.2)
 */

///---------------------------- USEFUL VARIABLES -----------------------------///
LETTERS     = new Array("A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P");  // to define 384 plate
COLS        = new Array("01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24");
sharp = '#';
star  = '*';
dash  = '-';
equal = '=';
space = ' ';
FILESEP	 = ['/','\\\\'];
FIELDSEP = ['\t',','];
BITMODE  = ['8-bit','16-bit'];

PATH2FUNCTIONS = "Functions_CellGridMontage.js";
load(PATH2FUNCTIONS);
if( !File(PATH2FUNCTIONS).exists() ){ ERRORexit("Cell Grid Montage functions are missing..."); }
///----------------------------        MAIN       ----------------------------///
MONTAGE=initMontageParams();

/// DEFAULT VALUES /// 
inputfile  = "/media/elusers/users/benjamin/A-PROJECTS/01_PhD/04-image-analysis/JS4Fiji/input-for-cell-grid-montage.tsv";
outdir     = "./";
screenname = "test-cellgrid"; 
gridside   = 15;
cellsize   = 65;
picperwell = 8;
delim      = 1;
fsep       = 1;
bitmode    = 1;
STOP       = 1000000;
VERBMAX    = 4; // Skip low-level debug messages 

SEP = FILESEP[fsep-1];
DELIM = FIELDSEP[delim-1];
BIT = BITMODE[bitmode-1];

name  = screenname + "_" + BIT;
MONTAGEtype  = BIT + " black";
PICPERWELL  = picperwell;  ///INPUT/// HERE INDICATE HOW MANY PICTURES WERE TAKEN PER WELL
CELLSIZE    = cellsize; ///INPUT/// HERE INDICATE HOW MANY PIXELS PER SIDE FOR CROPPING CELLS
CELLSIDE    = gridside; ///INPUT/// HERE INDICATE HOW MANY CELLS PER SIDE OF THE CELL GRID

IJ.log(space.repeat(100));
IJ.log('INPUT FILE is '+inputfile);
IN=openTable(inputfile,DELIM,true);
INPUT = IN['data'];
HEADER = IN['fields'].join(" ");
var CHANNELS = HEADER.match(/c[0-9]/gi);
IJ.log("COLUMNS NAMES FOR CHANNELS ARE : " + CHANNELS);
IJ.log(space.repeat(100));
OUTDIR = dirname(outdir,SEP);
IJ.log('OUTPUT DIRECTORY is '+OUTDIR);
IJ.log(space.repeat(100));

///INPUT/// FINALLY YOU NEED TO DEFINE THE LUT, WHICH CORRESPONDS TO THE COLORSPACE THAT NEEDS TO BE USED TO REPRESENT INTENSITIES (for example RFP is displayed as red pixels)
LUT=new Array("Grays","Green","Red","Cyan");

///INPUT/// HERE IS THE OUPTUT DIRECTORY FOR THE MONTAGE IMAGE
var MontageFolder = File(OUTDIR);
if(!MontageFolder.exists()){ 
	IJ.log("Output directory does not exist!");
	IJ.log("Creating directory '"+OUTDIR+"'...");
	MontageFolder.mkdir();
}

IJ.log(space.repeat(100));
setMontageParam(MONTAGE,"PICPERWELL",picperwell);
setMontageParam(MONTAGE,"CELLPERSIDE",gridside);
setMontageParam(MONTAGE,"pxCELL",cellsize);
setMontageParam(MONTAGE,"FILENAME",name);
setMontageParam(MONTAGE,"BITMODE",BIT);
setMontageParam(MONTAGE,"BACKGROUND",'black');
IJ.log(space.repeat(100));

MONTAGE = updateMontageParams(MONTAGE);
IJ.log("Name of the Montage     : "+MONTAGE['FILENAME']);
IJ.log("Montage Image type      : "+MONTAGE['BITMODE']);
IJ.log("Montage Width           : "+MONTAGE['WIDTH']);
IJ.log("Montage Height          : "+MONTAGE['HEIGHT']);
IJ.run("Close All", "");
IJ.log(space.repeat(100));

initRM();

IJ.log(space.repeat(100));
getMontageAllParams(MONTAGE); // PRINTING MONTAGE PARAMETERS
IJ.log(space.repeat(100));

var t0 = new Date().getTime();
for(var ich=0; ich<CHANNELS.length; ich++){

	var t1 = new Date().getTime();
	var ch = CHANNELS[ich];
	IJ.log('current channel is '+ch);
	
	var STATUS = initCopyStatus(MONTAGE['pxBORDER'],MONTAGE['pxBORDER']);
	STATUS['channel'] = ch;
	
	for(var irow=0; irow<INPUT.length && irow <= STOP; irow++){

		var t2 = new Date().getTime();
		
		STATUS['LASTROW'] = (irow == INPUT.length-1 || irow == STOP);
		if(MONTAGE['skipFirstPIC']){ IJ.log("...SKIPPING THE FIRST PICTURE OF THE WELL..."); STATUS['picno']++; continue; }
	
		// CHECK IF WELL HAS BEEN VISITED
		NextWell(STATUS['well'], INPUT[irow]['well'], MONTAGE,STATUS,INPUT[irow]['orf']);
	
		display(3,"(1) Get detected cells in segmented image from (channel c0)");
		// READ IMAGE FILE WITH SEGMENTED CELLS
		var SEG = getImageSegmented(INPUT[irow]['c0']);
		if( SEG == null ){ STATUS['picno']++; continue; }
		
		// RETRIEVE SEGMENTED CELLS
		var CELLS = getCells(SEG);
		STATUS['NCELLS'] = CELLS.length;
		display(3,"=> Number of cells detected in segmented image : "+STATUS['NCELLS']);
		if( CELLS.length == 0 ){ STATUS['COPY'] == false;  STATUS['picno']++;  continue; }
		else{ STATUS['COPY'] = true; }
		STATUS['NKEEP'] = STATUS['NCELLS'] - STATUS['NDROP'];
		STATUS['TOTALCELLS'] += STATUS['NKEEP'];
	
		// CREATE A LARGE BLANK IMAGE FOR THE MONTAGE WITH A NAME BASED ON PLATE NUM AND CHANEL CHOOSED
		//var MONTAGEimp=IJ.createImage(MONTAGE['FILENAME'],MONTAGE['BITMODE']+" "+MONTAGE['BACKGROUND'],MONTAGE['WIDTH'],MONTAGE['HEIGHT'],1);	
		//IJ.log("Show Montage window");
		//MONTAGEimp.show();

		var IMG = INPUT[irow][ch];
		if(	!IMG.exists ){ IJ.log("IMAGE FROM CHANNEL "+IMG+" IS MISSING"); ipic++; continue; }
		
		if( STATUS['picno'] == 1 ){
			initRM(RM); // Clear ROI manager
			// Create grid image for current well
			var wellname = INPUT[irow]['plate']+"."+INPUT[irow]['orf']+"."+INPUT[irow]['well']+"."+ch ;
			display(4,'==> CELL GRID IMAGE = '+wellname);
			var CELLGRID = IJ.createImage(wellname,MONTAGE['BITMODE']+" "+MONTAGE['BACKGROUND'],MONTAGE['WELLSIDE'],MONTAGE['WELLSIDE'],1);	
			IJ.run(CELLGRID, LUT[ich], "");
			CELLGRID.show();
		}

		makeCellGrid(CELLGRID, IMG, CELLS, MONTAGE, STATUS);
		
		if( STATUS['picno'] == MONTAGE['PICPERWELL'] ){
			IJ.log(equal.repeat(100));
			var t3 = new Date().getTime();
			IJ.log("PROCESSING WELL " + INPUT[irow]['well'] + " TOOK : " + Math.round((t3-t2)) + " milliseconds");
			IJ.log(equal.repeat(100));
		}
	
		while(CELLS.length > 0 ){ CELLS.pop(); }
		display(4,"PICNUM "+STATUS['picno']+" => NCELLS="+STATUS['NCELLS']+" KEPT="+STATUS['NKEEP'] + " DROPPED="+STATUS['NDROP']);
		STATUS['picno']++;
		display(3,space.repeat(100));
	}
	
	IJ.log(space.repeat(100));
	IJ.log(sharp.repeat(100));
	var t4=new Date().getTime();
	IJ.log("TIME TAKEN FOR CHANNEL "+ch+" : " + Math.round((t4-t1)/1000) + " sec " );
	IJ.log(sharp.repeat(100));
	IJ.log(space.repeat(100));

}

IJ.log(space.repeat(100));
IJ.log(star.repeat(100));
var t5=new Date().getTime();
IJ.log("TOTAL TIME : " + Math.round((t5-t0)/1000) + " sec " );
IJ.log(star.repeat(100));
IJ.log(space.repeat(100));
