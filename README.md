# Cell-Grid-Montage
This Javascript must be run within imageJ/Fiji. 
It creates a montage image where cells identified in microscopy images (saved as ROIs) are extracted and arrayed on a grid.


### Format of the screen definition file
To apply our script to your images, a tabulated file (TSV or CSV format) with the following fields (columns) is required.
The first row should start with a hashtag sign ("#") followed by the name of the required fields :

 #plate | well | orf | c0 | c1 | c2 | c3 |
-------|------|-----|----|----|----|----|
plate1 | A01  | YAL002W | screen-brightfield-00001.tif | screen-GFP-00001.tif | screen-RFP-00001.tif | screen-BFP-00001.tif |
plate1 | A01  | YAL002W | screen-brightfield-00002.tif | screen-GFP-00002.tif | screen-RFP-00002.tif | screen-BFP-00002.tif |
....
plate1 | P24  | NA | NA | NA | NA | NA |

1. *plate* gives the number of the 384 well plate from which images were acquired (for a proteome-wide screen, this typically ranges from 1 to 16).
2. *well* id must be 3 characters long starting from A01 to P24 (it should be 384 wells exactly).
3. *orf* must contain an uppercase identifier for the gene locus tagged.

4. *c0* must contain full path to the images containing segmentation information. ROIs must be saved as overlays and the images should be in OME-TIFF file format.<sup>[1](#channelFootnote)</sup>
5. *c1* must contain full path to the images corresponding to the first fluorescent channel.<sup>[1](#channelFootnote)</sup>
6. *c2* must contain full path to the images corresponding to the second fluorescent channel (if available, set to NA otherwise).<sup>[1](#channelFootnote)</sup>
7. *c3* must contain full path to the images corresponding to the third fluorescent channel (if available, set to NA otherwise).<sup>[1](#channelFootnote)</sup>

<a name="channelFootnote"><sup>1</sup></a>
###### The fields corresponding to channels (c0,c1,c2,c3) must contain full paths to the images and should correspond to the plate, well and orf written. If several images were acquired per well, you can add as many rows as needed as long as the "plate", "well" and "orf" fields are duplicated (*cf* example above).If you have missing images, the fields may be left blank or indicated by "NA" (i.e. not available).


### Pseudo-Algorithm
    initialize ImageJ
    STATUS  = initialize global variables
    MONTAGE = set Montage Parameters
    FIELDS = read and split first row of **input.tsv**
    if FIELDS corresponds to : plate well orf c0 c1 c2 c3
        INPUT = load **input.tsv**
    else
        exit("Input file is invalid.")

    For each rowInput in INPUT:

        1. Check if well has been visited
           if FALSE :
              update STATUS (picnum reset to 1, get well position on plate)
              GRIDIMG = create grid image for each channel
    
        2. Get detected cells in segmented image (channel c0) in Array of Cell Objects (CELLS)
           if CELLS length is 0 :
              skip to next rowInput
           else
              For each CHANNEL ( c0 c1 c2 c3 )
                  if STATUS->PlateMontage == TRUE and STATUS->FIRSTWELL == TRUE
                      PLATEIMG = create 384-wellplate montage image

                  CHIMG = open image from CHANNEL
                  
                  if STATUS->Copy == TRUE
                      3.a) copy ROI from CELLS from CHIMG to corresponding GRIDIMG
                           if STATUS->CopiedCells == MONTAGE->MaxCellPerWell
                               save GRIDIMG as TIFF with labels
                               set STATUS->Copy to FALSE
                  else
                      3.b) skip to next rowInput
              end of CHANNEL loop
    
         if STATUS->PlateMontage == TRUE
             4. Copy GRIDIMG to PLATEIMG at well position on plate
             
         close GRIDIMG

     end of INPUT loop


-----


If you wish to upload your own microscopy screens to yeastRGB.org, please follow these guided instructions.
**Implortantly, the image processing script will require ALREADY identified cells or cell centers in your images (saved as ROIs).** 

Send an email at benjamin.dubreuil@weizmann.ac.il with the following information :


* Corresponding email address to be mentioned on the web-site,
* Authors names,
* Screen name (less than 15 characters),
* Publication reference(s)
* Strain genotype and condition in which it was imaged,
* Microscopy screen definition file (detailed below)
