# Cell-Grid-Montage

This Javascript can be used within ImageJ to generate a montage where cells are extracted from 


To apply our script to your images, you would be kindly ask to input a screen definition file in a tabulated format (TSV or CSV).
The first row should start with a hashtag sign ("#") followed by the name of the required fields :

    plate must correspond to the number of the 384 well plate from which images were acquired.
    well id must be 3 characters long starting from A01 to P24 (384 wells minimum).
    orf must contain an uppercase identifier for the gene locus tagged.
    c0 must contain full path to the images containing pre-segmented cells. Cell ROIs must be saved as overlays and the images should be in OME-TIFF file format.
    c1 must contain full path to the images corresponding to the first fluorescent channel.
    c2 must contain full path to the images corresponding to the second fluorescent channel.
    c3 must contain full path to the images corresponding to the third fluorescent channel.


* The last fields must contain full paths to the images and should correspond to the plate, well and orf written. If several images were acquired per well, you can add as many rows as needed as long as the "plate", "well" and "orf" fields are duplicated. If you have missing images, the fields may be left blank or indicated by "NA" (i.e. not available).


*Pseudo-Algorithm:*


STATUS=initGlobalVariables
MONTAGE=setMontageParameters
Load input.tsv
If columns are : plate well orf c0 c1 c2 c3

For each rowInput:
    0. Check if well has been visited
       if FALSE :
          update STATUS (picnum reset to 1, get well position on plate)
          createImage GRID for each channel

    1. Get detected cells in segmented image (channel c0) in Array of Cell Objects (CELLS)
       if CELLS length is 0 :
          skip to next rowInput
       else
          For each channel ( c0 c1 c2 c3 )
              open Image Channel
              if( COPY == true)
                  2.a) copy ROI from CELLS from ImageChannel to corresponding Image GRID
                       if CopiedCells == MaxCellPerWell
                           save Image GRID as TIFF with Labels
                           close Image GRID
                           set COPY = false
              else
                  2.b) skip to next rowInput
