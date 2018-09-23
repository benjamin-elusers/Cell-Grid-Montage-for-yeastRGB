/* Author  : Benjamin Dubreuil
 * Date    : 23 Sept. 2018 
 * Project : YeastRGB - Cell Grid Montage (v4.2)
 * Instructions
    To run in batch mode from Command Line Interface. 
    Usage > xvfb-run -a [PATH/TO/FIJI] [PATH/TO/CELL-GRID-SCRIPT] 'arg1 arg2 arg3 ...'
    *Mandatory script arguments
      arg1:  PATH/TO/TABULATED/INPUT/FILE
      arg2: PATH/TO/OUTPUT/DIRECTORY
      arg3: SCREEN NAME
    *Optional Arguments :
      arg4: [INTEGER, default=15] Number of cells on each grid side
      arg5: [INTEGER, default=65] Size of cell in pixels
      arg6: [INTEGER, default=8] Number of pictures per well
      arg7: [INTEGER, default=1] Field delimiter -> 1='tab' (\t) or 2='comma' (,)
      arg8: [INTEGER, default=1] Path separator -> 1='unix' (/) or 2='windows' (\)
      arg9: [INTEGER, default=1] Image bitmode -> 1='8bit' or 2='16bit'
      arg10: [INTEGER, default=1000000] Stop processing when row input reach this value
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

/// SCRIPT PARAMETERS ///
var arguments;
print("ARGUMENTS : " + arguments);
var re  = /, ;/;
var ARG = String(arguments).split(' ');
print("NUMBER OF ARGUMENTS :" + ARG.length);
if( ARG.length < 3 ){ ERRORexit('Need 3 arguments at least'); }
IJ.log(space.repeat(100));

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
// MANDATORY
if( File(ARG[0]).exists() ){ inputfile = ARG[0]; }else{ ERRORexit("TABULATED INPUT FILE DOES NOT EXIST ("+ARG[0]+")"); }
if( File(ARG[1]).isDirectory() ) { outdir = ARG[1]; }else{ ERRORexit("OUTPUT PATH IS NOT A DIRECTORY"); }
if( ARG[2] !== undefined ){ screenname = ARG[2]; }

// USE DEFAULT VALUE UNLESS 
if( ARG[3] === undefined ){ ARG[3] = gridside;   }
if( ARG[4] === undefined ){ ARG[4] = cellsize;   }
if( ARG[5] === undefined ){ ARG[5] = picperwell; }
if( ARG[6] === undefined ){ ARG[6] = delim;      }
if( ARG[7] === undefined ){ ARG[7] = fsep;       }
if( ARG[8] === undefined ){ ARG[8] = bitmode;    }
if( ARG[9] === undefined ){ ARG[9] = STOP; }


if( isInt(ARG[3]) ){ gridside = ARG[3]; }else{ ERRORexit("Side length of cell-grid must be an integer (in # of cells) !"); }
if( isInt(ARG[4]) ){ cellsize = ARG[4]; }else{ ERRORexit("Cell size must be an integer (in pixels) !"); }
if( isInt(ARG[5]) ){ picperwell = ARG[5]; }else{ ERRORexit("Pictures per well must be an integer !");}
if( ARG[6] != 1 || ARG[6] != 2 ){ delim = ARG[6];   }else{ ERRORexit("Choice for field delimiter must be 1 ('\\t') or 2 (',') !"); }
if( ARG[7] != 1 || ARG[7] != 2 ){ fsep = ARG[7];    }else{ ERRORexit("Choice for path separator must be 1 (unix '/') or 2 (window '\\\\') !"); }
if( ARG[8] != 1 || ARG[8] != 2 ){ bitmode = ARG[8]; }else{ ERRORexit("Choice for bitmode must be 1 (8bit) or 2  (16bit) !"); }
if( isInt(ARG[9]) || ARG[9] > 1 ){ STOP = ARG[9]; display(3,'Will stop at input row = '+STOP); }

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
