# @File (style="directory",label="Directory containing segmentation files.",persist=false) input_seg
# @File (style="directory",label="Directory containing image files.",persist=false) input_img
# @File (style="directory",label="Output directory for results.",persist=false) input_out
# @String (label="Plate identifier.",persist=false) input_plate
# @String (choices={"Cell", "Grid"},style="radioButtonHorizontal",label="Contrast adjustment.",persist=false) ADJUST_CONTRAST
# @Integer(label="Percentage of Saturated Pixels", value=2, style="slider", min=0, max=100,persist=false) SATURATED
# @Integer (label="Bit mode for image processing.", persist=false, value=16) input_bitmode
# @Integer (label="Width of the cell.",value=65, persist=false) input_cell_width
# @Integer (label="Height of the cell.",value=65, persist=false) input_cell_height
# @Integer (label="Number of cells per side of the grid.",value=20, persist=false) input_cell_per_side

import sys
import os
import argparse
import time
import logging
import re
import csv
from datetime import timedelta
from collections import defaultdict
from java.io import File
from java.lang import Math, System
import java.io as io
from ij import IJ, ImagePlus
from ij.gui import Roi, Overlay, Line
#from ij.plugin.frame import RoiManager
import ij.WindowManager as WM

def natural_sort_key(s):
  """A key function for sorting alphanumerically."""
  return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def recursive_defaultdict():
    return defaultdict(recursive_defaultdict)

# Global variable declaration
VERSION = "v3"
LOGFILE = None
RESULT = None

def make_output(out_dir):
  """Ensure that specified output directory exists, create if not."""
  if not os.path.exists(out_dir):
    os.makedirs(out_dir)
    print("Output directory created: {}".format(out_dir))
    return True
  else:
    print("Output directory already exists: {}".format(out_dir))
    return False

def custom_log(message, file_path):
    """ Writes a message to a specified file."""
    # Open the file in append mode
    file_writer = io.FileWriter(file_path, True)
    buffered_writer = io.BufferedWriter(file_writer)
    # Write the message and a newline
    buffered_writer.write(message + "\n")
    # Important to flush and close to ensure all data is written to the file
    buffered_writer.flush()
    buffered_writer.close()

def map_segmentations_to_images(seg_dir, img_dir):
  # Dictionary to hold the mapping of files structured by well and position
  image_files = recursive_defaultdict()
  # List all files in the directories
  seg_files = [f for f in os.listdir(seg_dir) if f.endswith(".tif")]
  img_files = [f for f in os.listdir(img_dir) if f.endswith(".tif")]

  # Regular expression to extract the necessary parts of the file names
  seg_pattern = r"(([A-P]\d{1,2}--W\d{5})--(P\d{5})--Z\d{5}--T\d{5})--\w+\.tif$"
  img_pattern = r"(([A-P]\d{1,2}--W\d{5})--(P\d{5})--Z\d{5}--T\d{5})--\w+\.tif$"

  # Process segmentation files
  for seg_file in seg_files:
    match = re.match(seg_pattern, seg_file)
    if match:
      core_identifier = match.group(1)
      well = match.group(2)
      position = match.group(3)
      #IJ.log(core_identifier)
      #IJ.log(well)
      #IJ.log(position)

      matched_images = [os.path.join(img_dir, img) for img in img_files if core_identifier in img]
      image_files[well][position]['seg'] = os.path.join(seg_dir, seg_file)
      image_files[well][position]['img'] = matched_images
    else:
      print("No match found for segmentation file: ", seg_file)
  return image_files

def detect_channels(img_dir):
  channels = set()  # Use set to store unique channels
  img_files = [f for f in os.listdir(img_dir) if f.endswith(".tif")]
  img_pattern = r".*--W\d{5}--P\d{5}--Z\d{5}--T\d{5}--(\w+)\.tif$"

  for img_file in img_files:
    match = re.match(img_pattern, img_file)
    if match:
      channel = match.group(1)
      channels.add(channel)
    else:
      custom_log("No channels found for image file:"+ img_file,LOGFILE)

  if not list(channels):
    return ["TransCon","488nm"]
  else:
    custom_log("Detected channels:"+ str(channels),LOGFILE)

  return list(channels)  # Convert set to list before returning


def distribute_cells_across_positions(cells_by_position, target_total=401, min_cells_per_position=200):
  total_cells = sum(len(cells) for cells in cells_by_position.values())
  collected_cells = {}

  if total_cells <= target_total:
    # If total cells are less than or equal to target, use all cells.
    return cells_by_position

  # Calculate initial collection based on minimum requirement
  for position in sorted(cells_by_position.keys(), key=natural_sort_key):
    cell_pos = cells_by_position[position]
    if len(cell_pos) < min_cells_per_position:
      # Take all cells if below the minimum threshold
      collected_cells[position] = list(cell_pos)
    else:
      # Prepare for proportional sampling
      collected_cells[position] = []

  # Calculate how many cells have been collected and how many are still needed
  cells_collected = sum(len(cells) for cells in collected_cells.values())
  remaining_cells_needed = target_total - cells_collected
  #custom_log("NEEDED "+str(remaining_cells_needed),LOGFILE)
  # Distribute remaining cells needed across positions with enough cells
  remaining_cells_available = sum(len(cells) for position, cells in cells_by_position.items() if len(cells) >= min_cells_per_position)
  #custom_log("AVAILABLE "+str(remaining_cells_available),LOGFILE)

  for position in sorted(cells_by_position.keys(), key=natural_sort_key):
    cell_pos = cells_by_position[position]

    if len(cell_pos) >= min_cells_per_position:
      if remaining_cells_available > 0:
        # Calculate the proportion of remaining cells this position should provide
        #custom_log("#CELLS  "+str(len(cells)),LOGFILE)
        #custom_log("#AVAILABLE"+str(remaining_cells_available),LOGFILE)
        proportion = float(len(cell_pos)) / float(remaining_cells_available)
        custom_log("---> "+position+" "+str(len(cell_pos))+"cells => sampling prob. ="+str(round(proportion,2)),LOGFILE)
        num_to_take = int(proportion * remaining_cells_needed)
        num_to_take = min(num_to_take, len(cell_pos))  # Ensure not taking more than available
        step = max(1, len(cell_pos) // num_to_take)
        sampled_cells = cell_pos[::step][:num_to_take]
        collected_cells[position].extend(sampled_cells)
      else:
        # If no cells are left to distribute, add as needed
        collected_cells[position].extend(cell_pos[:min(num_to_take, len(cell_pos))])
  return collected_cells

def mark_extreme_intensity_cells(cells, imp):
    """find top/bottom 10% of cells based on average pixel intensity."""
    
    intensities = []
    # Calculate average intensity for each cell
    for index, cell in enumerate(cells):
        intensities.append((index, cells.mean))
    
    # Sort by intensity
    intensities.sort(key=lambda x: x[1])  # Sort by intensity stored in each tuple

    # Determine indices for the top and bottom 10%
    num_cells = len(intensities)
    ten_percent = int(num_cells * 0.10)
    
    darkest_indices = [idx for idx, intensity in intensities[:ten_percent]]
    brightest_indices = [idx for idx, intensity in intensities[-ten_percent:]]

    # Optionally, you could remove these cells from the list if they should not be processed further
    return {'darkest': darkest_indices, 'brightest': brightest_indices}

def adjust_contrast(imp,saturated=0.02):
  ip = imp.getProcessor()
  # Calculate the histogram
  histogram = ip.getHistogram()
  total_pixels = sum(histogram)
  cumulative_count = 0
  
  # Determine the 95th percentile for max display
  threshold_95 = 0
  for i, count in enumerate(histogram):
    if count > 0 :
      #print("intensity = "+str(i))
      cumulative_count += count
      #print("cumulative count = "+str(cumulative_count))
      ratio = float(cumulative_count) / float(total_pixels)
      #print("ratio = {:.2f}".format(ratio))
  
      if ratio >= 1-saturated:
        threshold_95 = i
        break
#  print(ip.getMax())
#  print(threshold_95)
  # Get the min and max pixel value for display
  min_display = ip.getMin()
  max_display = threshold_95

  # Set the display range
  ip.setMinAndMax(min_display, max_display)
  imp.updateAndDraw()
  return imp


def close_log_window():
    log_window = WM.getWindow("Log")
    if log_window is not None:  # Checks if the Log window is open
        log_window.close()  # Closes the Log window

def get_roi_manager():
  rm = RoiManager.getInstance()
  if rm is None:
    rm = RoiManager(True)
  return rm

class Cell:
    def __init__(self, idx=None, roi=None):
        """Initialize the Cell with optional index and ROI."""
        self.idx = idx
        self.type = 'cell'
        self.roi = roi
        self.area = None
        self.x = None
        self.y = None
        self.mean = None
        self.median = None
        self.sd = None

    def __str__(self):
        return "idx: {}, roi: {}, area: {}, xVal: {}, yVal: {}, type: {}, mean: {}, median: {}, sd: {}".format(
            self.idx, self.roi, self.area, self.x, self.y, self.type, self.mean, self.median, self.sd)

    def update_statistics(self, imp, ip):
        """Update all statistics for the ROI on the given image processor."""
        if self.roi is None:
            raise ValueError("ROI must be set before updating statistics.")
        imp.setRoi(self.roi, False)
        ip.setRoi(self.roi)
        stats = ip.getStatistics()
        
        self.area = stats.area
        self.x = stats.xCenterOfMass
        self.y = stats.yCenterOfMass
        self.mean = stats.mean
        self.median = stats.median
        self.sd = stats.stdDev

def overlay_to_cells(overlays, imp, ip):
  """Convert overlays to Cell objects and compute statistics."""
  cells = []
  for iroi, roi in enumerate(overlays):
      if roi is None:
        custom_log("OVERLAY #{} DOES NOT EXIST!".format(iroi), LOGFILE)
        continue
      cell = Cell(idx=iroi, roi=roi)
      try:
        cell.update_statistics(imp, ip)
        cells.append(cell)
      except Exception as e:
        custom_log("Failed to update statistics for cell {}: {}".format(iroi, str(e)), LOGFILE)
  return cells


def drawgrid(grid, gridspacing):
  by_col = False
  overlay = Overlay()
  w = grid.getWidth()
  h = grid.getHeight()

  if by_col:
    for x in range(0, w, gridspacing):
      for y in range(0, h, gridspacing):
        square = Roi(x, y, gridspacing, gridspacing)
        overlay.add(square)
  else:  # By rows
    for y in range(0, h, gridspacing):
      for x in range(0, w, gridspacing):
        square = Roi(x, y, gridspacing, gridspacing)
        overlay.add(square)

  grid.setOverlay(overlay)
  return grid

def set_lut(imp,channel):
  # Apply the LUT based on the channel description
  if channel == '488nm':
    IJ.run(imp, "Green", "")  # Apply green LUT
  elif channel == '561nm':
    IJ.run(imp, "Red", "")    # Apply red LUT
  elif channel == 'DAPI' or channel == '405nm':
    IJ.run(imp, "Blue", "")   # Apply blue LUT
   #IJ.log("Unknown channel. No LUT applied.")

def save_and_close_grid(cell_grid, out_dir, out_name,channel):
  IJ.run(cell_grid, "Select None", "")
  #rm.moveRoisToOverlay(cell_grid);
  set_lut(cell_grid,channel)
  IJ.saveAs(cell_grid, "Tiff", out_dir + '/' + out_name + '.tif')

  #IJ.run(cell_grid, "Enhance Contrast", "saturated=0.35 normalize equalize")
  if ADJUST_CONTRAST=='Grid':
    SATURATED_01 = float(SATURATED)/100
    cell_grid = adjust_contrast(cell_grid,SATURATED_01)
  IJ.saveAs(cell_grid, "PNG", out_dir + '/' + out_name + '.png')
  cell_grid.changes = False
  cell_grid.close()
  ##IJ.selectWindow("Log")
  ##IJ.saveAs("Text", out_dir + '/' + "cellgrid-v1.log")
  IJ.run("Close All", "")

def get_cells(imp):
  """Retrieve overlays from segmented image and convert to cell ROIs."""
  if imp is None:
    custom_log("No image was loaded - cannot proceed to retrieve cells.",LOGFILE)
    return []

  ip = imp.getProcessor()
  overlays = imp.getOverlay()  # Get the cell overlays from the image
  #imp.show()
  cells = overlay_to_cells(overlays, imp, ip) if overlays is not None else []
  return cells

def copy_roi(img, xroi, yroi, width, height, bit):
  xint = int(xroi - width / 2)
  yint = int(yroi - height / 2)
  square = Roi(xint, yint, width, height)
  img.setRoi(square)
  IJ.run(img, "Copy", "")

  # Create a temporary image of cell size
  tmp = IJ.createImage("TMP", "{}-bit".format(bit), width + 1, height + 1, 1)
  
  # Paste the cell in the temporary 8-bits image
  tmp_roi = Roi(1, 1, width, height)
  tmp.setRoi(tmp_roi)
  IJ.run(tmp, "Paste", "")
  if ADJUST_CONTRAST=='Cell':
    IJ.run(tmp, "Enhance Contrast", "saturated=0.35")
    #SATURATED_01 = float(SATURATED)/100
    #tmp = adjust_contrast(tmp,SATURATED_01)
  img.killRoi()
  return tmp

def process_well_cells(positions):
  cells = defaultdict(lambda: defaultdict(dict))
  # Sort positions naturally within each well
  for position in sorted(positions.keys(), key=natural_sort_key):
    #IJ.log("    3. Position:" + position)
    data = positions[position]
    SEG = IJ.openImage(data['seg'])
    #SEG.show()
    cells[position] = get_cells(SEG)  # This function needs to extract ROI data from the segmentation
  return(cells)

def process_cells(seg2img, out_dir, plate, channels, bitmode, cell_width, cell_height, cell_per_side):
    grid_width = cell_width * cell_per_side
    grid_height = cell_height * cell_per_side
    cell_per_grid = cell_per_side**2


    for well, positions in sorted(seg2img.items(), key=lambda x: natural_sort_key(x[0])):
      #ITERATION=ITERATION + 1
      well_start_time = time.time()
      custom_log("",LOGFILE)
      custom_log("Well: {}".format(well),LOGFILE)
        
      all_cells = process_well_cells(positions);
      total_cells = sum(len(cells) for position, cells in all_cells.items())
      custom_log("# cells in well: "+str(total_cells),LOGFILE)
      sampled_cells = distribute_cells_across_positions(all_cells)
      total_sampled = sum(len(cells) for position, cells in sampled_cells.items())
      custom_log("# cells sampled: "+str(total_sampled),LOGFILE)

      for channel in channels:
        STATISTICS=defaultdict(lambda: defaultdict(dict))
        channel_start_time = time.time()
        out_name = "CELLGRID--" + plate + "--"+ well + "--" + channel
        custom_log("    Channel: "+ channel,LOGFILE)
        if os.path.exists(out_dir+"/"+out_name):
          grid = openImage(out_dir+"/"+out_name)
          continue
        else:
          grid = IJ.createImage(out_name, "{}-bit black".format(bitmode), grid_width, grid_height, 1)
        
        grid_overlay = Overlay()

        gridxx=0
        gridyy=0
        cell_copied=0
        cells_copied_row=0
        
        for position in sorted(positions.keys(), key=natural_sort_key):
          data = positions[position]
          img = [img for img in data['img'] if channel in img]
          IMG = IJ.openImage(img[0])
          cell_copied_position = 0
          IJ.run(IMG, "Gaussian Blur...", "sigma=1.00")
          IJ.run(IMG, "Subtract Background...", "rolling=50")
          IJ.run(IMG, "Enhance Contrast", "saturated=0.35")
  
          CELLS = sampled_cells[position]
          n_available = len(all_cells[position])
          n_sampled = len(CELLS)
          STATISTICS[well][position]['total_available'] = total_cells
          STATISTICS[well][position]['total_sampled'] = total_sampled 

          STATISTICS[well][position]['n_available'] = n_available
          STATISTICS[well][position]['n_sampled'] = n_sampled 
          
          id_cells = []
          for icell, cell in enumerate(CELLS):
            tmp = copy_roi(IMG, cell.x, cell.y, cell_width, cell_height, str(bitmode))
            if cells_copied_row >= cell_per_side:
              gridxx = 0
              cells_copied_row = 0
              gridyy += 1
            local_x = gridxx * cell_width
            local_y = gridyy * cell_height
      
            IJ.run(tmp, "Copy", "")
            tmp.changes = False
            tmp.close()
            square = Roi(local_x, local_y, cell_width, cell_height)
            square.setName(position+"--"+str(cell.idx))
            grid_overlay.add(square)
            grid.setRoi(square)
              
            if(cell_copied <= cell_per_grid):
              IJ.run(grid, "Paste", "")
              id_cells.append(str(cell.idx+1))
              cell_copied=cell_copied+1
              cell_copied_position=cell_copied_position+1
              cells_copied_row += 1
              gridxx += 1

          STATISTICS[well][position]['cells_selected'] = "|".join(id_cells)
          id_cells = []
          STATISTICS[well][position]['n_copied'] = cell_copied_position
          STATISTICS[well][position]['total_copied'] = cell_copied
          custom_log(position+" --> cropped "+str(cell_copied_position)+" cells",LOGFILE)
        
        grid.setOverlay(grid_overlay)
        #cellgrid = drawgrid(grid, cell_width)
        save_and_close_grid(grid, out_dir, out_name, channel)
        channel_elapsed_time = time.time() - channel_start_time
        custom_log("--> processed channel: {:.2f} seconds".format(channel_elapsed_time),LOGFILE)

      write_cell_statistics(STATISTICS,RESULT)
      # Save the cell grid
      custom_log("Total copied cells = "+str(cell_copied),LOGFILE)
      well_elapsed_time = time.time() - well_start_time
      custom_log("-> processed well: {:.2f} seconds".format(well_elapsed_time),LOGFILE)
        
      #rm.reset()

def main(seg_dir, img_dir, out_dir, plate, channels_to_process, bitmode=16, cell_width=65, cell_height=65, cell_per_side=20):
    # Show input and settings
    custom_log("Segmentation Directory: " + seg_dir,LOGFILE)
    custom_log("Image Directory: " + img_dir,LOGFILE)
    custom_log("Output Directory: " + out_dir,LOGFILE)
    custom_log("Adjust contrast by:"+ADJUST_CONTRAST,LOGFILE)
    custom_log("%% saturated pixels:"+str(SATURATED),LOGFILE)
    custom_log("Grid parameters:",LOGFILE)
    custom_log("Bitmode: {}, Cell Width: {}, Cell Height: {}, Cells per Side: {}".format(
        bitmode, cell_width, cell_height, cell_per_side),LOGFILE)
    seg2img = map_segmentations_to_images(seg_dir, img_dir)
    process_cells(seg2img, out_dir, plate, channels_to_process, bitmode, cell_width, cell_height, cell_per_side)
    #close_log_window()

def show_input():
  print("Segmentation Directory:", str(input_seg))
  print("Image Directory:", str(input_img))
  print("Output Directory:", str(input_out))
  print("Plate:", input_plate)
  print("Adjust contrast by:",ADJUST_CONTRAST)
  print("%% saturated pixels:",str(SATURATED))
  print("Bitmode:", input_bitmode)  
  print("Cell width:", input_cell_width)
  print("Cell height:", input_cell_height)
  print("Cell per side:", input_cell_per_side)  

def write_cell_statistics(statistics, filename):
  # Open a file for writing or appending
  if not os.path.exists(filename):
    write_header = True
  else:
    write_header = False

  with open(filename, 'a') as file:
    writer = csv.writer(file, delimiter='\t')
    header = ['well', 'position', 'tot_available', 'tot_sampled', 'tot_copied', 'n_available', 'n_sampled', 'n_copied', 'cells_selected']    
    if write_header:
    # Write the header row (if no file existed)
      writer.writerow(header)
    
    # Iterate over the data and write rows
    for well, positions in statistics.items():
      for position, stats in sorted(positions.items(), key=lambda x: natural_sort_key(x[0])):
        row = [
            well,
            position,
            stats['total_available'],
            stats['total_sampled'],
            stats['total_copied'],
            stats['n_available'],
            stats['n_sampled'],
            stats['n_copied'],
            stats['cells_selected']
        ]
        writer.writerow(row)


def setup_logging(out_dir, plate):
  global LOGFILE, RESULT
  LOGFILE = os.path.join(out_dir, "cellgrid_{}--{}.log".format(VERSION,plate))
  RESULT =  os.path.join(out_dir, "cellgrid_{}--{}_result.tsv".format(VERSION,plate))
  if os.path.exists(LOGFILE):
    os.remove(LOGFILE)

  if os.path.exists(RESULT):
    os.remove(RESULT)

  now = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
  custom_log("Log started at " + now, LOGFILE)
  custom_log("==================================", LOGFILE)
  custom_log("PROCESSING " + plate, LOGFILE)
  custom_log("==================================", LOGFILE)

if __name__ == '__main__':
  start_time = time.time()
  #rm = get_roi_manager()
  show_input()
  make_output(str(input_out))
  setup_logging(str(input_out),input_plate)
  channels_detected = detect_channels(str(input_img))
  main(str(input_seg), str(input_img), str(input_out), input_plate, channels_detected, input_bitmode, input_cell_width, input_cell_height, input_cell_per_side)
  
  total_elapsed_time = time.time() - start_time
  custom_log("==================================", LOGFILE)
  custom_log("Script finished at "+time.strftime("%Y-%m-%d %H:%M:%S", time.localtime()),LOGFILE)
  custom_log("==================================", LOGFILE)
  custom_log("Total execution time: {:.2f} seconds ({})".format(total_elapsed_time, str(timedelta(seconds=total_elapsed_time))),LOGFILE)

  System.exit(0)

#  IJ.log("Usage: cellgrid.-v3.py <seg_dir> <img_dir> <out_dir> <plate> [ADJUST_CONTRAST] [SATURATED] [bitmode] [cell_width] [cell_height] [cell_per_side]")
