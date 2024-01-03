import numpy as np
import datetime  # Add this import for datetime
import re
def load_bin(file_path:str, dtype=np.uint8):
    try:
        with open(file_path, 'rb') as file:
            data = np.fromfile(file, dtype=dtype)
        return data
    except IOError as e:
        print(f"File can't be opened: {e}")
        return None
    
def compress_file(arr:np.ndarray):
    arr_ = arr.reshape(-1, 18)
    comp_arr = np.zeros((len(arr_),8), dtype=np.uint8)
    for i in range(len(arr_)):
        comp_arr[i][0] = arr_[i][2]                  # Counter
        comp_arr[i][1] = arr_[i][3] | (arr_[i][5]<<4) # MSB 10
        comp_arr[i][2] = arr_[i][4]                  # LSB 0
        comp_arr[i][3] = arr_[i][6]                  # LSB 1
        comp_arr[i][4] = arr_[i][7] | (arr_[i][9]<<4) # MSB 32
        comp_arr[i][5] = arr_[i][8]                  # LSB 2
        comp_arr[i][6] = arr_[i][10]                 # LSB3
        comp_arr[i][7] = arr_[i][15]                 # Vib, WS, Lead Off, Bruxism
    return comp_arr.flatten()
def get_sig(arr:np.ndarray):
    arr_ = arr.reshape(-1,18)
    sig = np.zeros((len(arr_),4), dtype=np.uint16)
    for i in range(len(arr_)):
        sig[i][0] = (arr_[i][3].astype('uint16') << 8) | arr_[i][4].astype('uint16')
        sig[i][1] = (arr_[i][5].astype('uint16') << 8) | arr_[i][6].astype('uint16')
        sig[i][2] = (arr_[i][7].astype('uint16') << 8) | arr_[i][8].astype('uint16')
        sig[i][3] = (arr_[i][9].astype('uint16') << 8) | arr_[i][10].astype('uint16')
    return sig.flatten()
def vib_intensity(arr:np.ndarray):
    arr_ = arr.reshape(-1,18)
    vib = arr_[:,15]
    for i in range(len(vib)):
        vib[i] = vib[i]>>4
    vib[vib == 0] = 255
    return vib.min()

def count_episode(arr:np.ndarray):
    arr_ = arr.reshape(-1,18)
    vib = vib_intensity(arr_)
    counter = 0
    flag = False
    
    sig = get_sig(arr)
    for i in range(len(sig)-1):
        if flag:
            if (sig[i] == vib) and (sig[i+1] == 0):
                flag = False
        else:
            if (sig[i] == 0) and (sig[i+1] == vib):
                flag = True
                counter += 1
    return counter

def statistics(arr:np.ndarray):
    arr_ = get_sig(arr)
    return {'max':arr_.max(), 'min':arr_.min(), 'mean':int(arr_.mean())}

import re  # Add this import for regular expressions
def summary(file_path:str):
    arr = load_bin(file_path)
    ws = (arr[-3] >> 2) & 0b11
    episod = count_episode(arr)
    st = statistics(arr)

    # Extract the timestamp from the file path using regular expressions
    timestamp_match = re.search(r'(\d{8}_\d{6})\.bin', file_path)
    if timestamp_match:
        timestamp_str = timestamp_match.group(1)
        # Convert the timestamp to the desired format (YYYY-MM-DD HH:mm:ss)
        formatted_start_time = f"{timestamp_str[:4]}-{timestamp_str[4:6]}-{timestamp_str[6:8]} {timestamp_str[9:11]}:{timestamp_str[11:13]}:{timestamp_str[13:15]}"
    else:
        formatted_start_time = ""

    # Calculate the stop time based on the start time and length (in milliseconds)
    length = len(arr) / 4 / 1000  # Length in seconds
    stop_time = ""  # Initialize stop_time as an empty string
    if formatted_start_time:
        start_time = datetime.datetime.strptime(formatted_start_time, "%Y-%m-%d %H:%M:%S")
        stop_time = (start_time + datetime.timedelta(seconds=length)).strftime("%Y-%m-%d %H:%M:%S")

    # Convert int64 values to Python int type
    vth = int(arr[-4])
    number_of_br_episode = int(episod)
    sb_emg_maximum = int(st['max'])
    sb_emg_minimum = int(st['min'])
    sb_emg_mean = int(st['mean'])
    window_size = int(ws)
    
    # Convert NumPy arrays to Python lists
    vib_intensity_values = vib_intensity(arr).tolist()

    result = {
        'str_time': formatted_start_time,
        'stp_time': stop_time,
        'br_episode': number_of_br_episode,
        'fl_name': file_path,
        'sleep_duration': length,
        'VTH': vth,        
        'emg_max': sb_emg_maximum,
        'emg_min': sb_emg_minimum,
        'emg_mean': sb_emg_mean,
        'win_size': window_size,
        'vib_int': vib_intensity_values
    }

    return result