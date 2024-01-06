import numpy as np
import datetime  # Add this import for datetime
import re
import ctypes

path = '/home/ec2-user/.local/lib/python3.9/site-packages/miraclare/server/libnative_rev01.'
try:
    lib = ctypes.CDLL(path+'so')
except:
    lib = ctypes.CDLL(path+'dll')
    
def load_bin(file_path:str, dtype=np.uint8):
    try:
        with open(file_path, 'rb') as file:
            data = np.fromfile(file, dtype=dtype)
        return data
    except IOError as e:
        print(f"File can't be opened: {e}")
        return None

C_compress_file = lib.compress_file
C_compress_file.restype = ctypes.c_uint8
C_compress_file.argtypes = [ctypes.POINTER(ctypes.c_uint8), ctypes.POINTER(ctypes.c_uint8), ctypes.c_uint]
def compress_file(arr: np.ndarray):
    arr_ = arr.flatten()
    comp_arr = np.zeros(arr_.shape[0]//18* 8, dtype=np.uint8)

    # C_compress_file 함수에 전달하기 위한 배열 슬라이스 생성
    input_slice = np.ctypeslib.as_ctypes(arr_)
    output_slice = np.ctypeslib.as_ctypes(comp_arr)

    # C_compress_file 함수 호출
    C_compress_file(input_slice, output_slice, arr_.shape[0])

    return np.ctypeslib.as_array(output_slice, shape=comp_arr.shape)

C_get_sig = lib.get_sig
C_get_sig.restype = ctypes.c_uint8
C_get_sig.argtypes = [ctypes.POINTER(ctypes.c_uint8), ctypes.POINTER(ctypes.c_uint16), ctypes.c_uint]
def get_sig(arr:np.ndarray):
    arr_ = arr.flatten()
    sig = np.zeros(arr_.shape[0]*4, dtype=np.uint16)
    input_slice = np.ctypeslib.as_ctypes(arr_)
    output_slice = np.ctypeslib.as_ctypes(sig)
    C_get_sig(input_slice, output_slice, arr_.shape[0])
    return np.ctypeslib.as_array(output_slice, shape=sig.shape[0])

C_vib_intensity = lib.vib_intensity
C_vib_intensity.restype = ctypes.c_uint8
C_vib_intensity.argtypes = [ctypes.POINTER(ctypes.c_uint8), ctypes.c_uint]
def vib_intensity(arr: np.ndarray):
    arr_ = arr.flatten()
    input_slice = np.ctypeslib.as_ctypes(arr_)
    vib = C_vib_intensity(input_slice, arr_.shape[0])
    if vib == 255:
        return 0
    else:
        return vib

C_count_episode = lib.count_episode
C_count_episode.restype = ctypes.c_uint16
C_count_episode.argtypes = [ctypes.POINTER(ctypes.c_uint8), ctypes.c_uint]
def count_episode(arr:np.ndarray):
    arr_ = arr.flatten()
    input_slice = np.ctypeslib.as_ctypes(arr_)
    tmp = get_sig(arr_)
    signal_slice = np.ctypeslib.as_ctypes(tmp)
    return C_count_episode(input_slice, arr_.shape[0], signal_slice, tmp.shape[0])

def statistics(arr:np.ndarray):
    arr_ = get_sig(arr)
    return {'max':arr_.max(), 'min':arr_.min(), 'mean':int(arr_.mean())}

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
    vib_intensity_values = vib_intensity(arr)

    result = {
        'str_time': formatted_start_time,
        'stp_time': stop_time,
        'br_episode': number_of_br_episode,
        'fl_name': file_path,
        'VTH': vth,
        'sleep_duration': length,   
        'emg_max': sb_emg_maximum,
        'emg_min': sb_emg_minimum,
        'emg_mean': sb_emg_mean,
        'win_size': window_size,
        'vib_int': vib_intensity_values
    }

    return result

C_decompress_file = lib.decompressed_file
C_decompress_file.restype = ctypes.c_uint8
C_decompress_file.argtypes = [ctypes.POINTER(ctypes.c_uint8), ctypes.POINTER(ctypes.c_uint16), ctypes.c_uint]
def decompressed_file(comp_arr:np.ndarray):
    comp_arr_ = comp_arr.flatten()
    decomp_arr = np.zeros(comp_arr_.shape[0] // 8 * 9, dtype=np.uint16)

    # C_compress_file 함수에 전달하기 위한 배열 슬라이스 생성
    input_slice = np.ctypeslib.as_ctypes(comp_arr_)
    output_slice = np.ctypeslib.as_ctypes(decomp_arr)

    # C_compress_file 함수 호출
    C_decompress_file(input_slice, output_slice, comp_arr_.shape[0])

    return np.ctypeslib.as_array(output_slice, shape=decomp_arr.shape)