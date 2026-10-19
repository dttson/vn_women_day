import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { preparePhoto } from '../src/data/photo-repository';
const decoder=vi.hoisted(()=>({isHeic:vi.fn(),heicTo:vi.fn()}));
vi.mock('heic-to/csp',()=>decoder);
let decode:ReturnType<typeof vi.fn>,draw:ReturnType<typeof vi.fn>;
beforeEach(()=>{
  vi.clearAllMocks();
  decode=vi.fn().mockResolvedValue(undefined);draw=vi.fn();
  vi.stubGlobal('Image',class{src='';naturalWidth=3024;naturalHeight=4032;decode=decode;});
  vi.stubGlobal('document',{createElement:()=>({width:0,height:0,getContext:()=>({fillRect:vi.fn(),drawImage:draw}),toBlob:(done:(b:Blob)=>void)=>done(new Blob(['encoded'],{type:'image/jpeg'}))})});
  vi.spyOn(URL,'createObjectURL').mockReturnValueOnce('blob:original').mockReturnValue('blob:converted');
  vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  decoder.isHeic.mockResolvedValue(true);decoder.heicTo.mockResolvedValue(new Blob(['converted'],{type:'image/jpeg'}));
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('local image decoding',()=>{
  it('keeps native JPEG and Safari-supported HEIC on the lightweight path',async()=>{
    const result=await preparePhoto(new File(['image'],'Mom.HEIC',{type:'image/heic'}),'mom','Mẹ');
    expect(result.blob.type).toBe('image/jpeg');expect(decoder.heicTo).not.toHaveBeenCalled();
    expect(draw.mock.calls[0].slice(1)).toEqual([0,504,3024,3024,0,0,640,640]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:original');
  });
  it('converts iPhone HEIC locally when native decoding rejects it',async()=>{
    decode.mockRejectedValueOnce(new DOMException('Unsupported','EncodingError'));
    const file=new File(['heic'],'Mom1.heic',{type:'image/heic'});
    const photo=await preparePhoto(file,'mom','Mẹ');
    expect(decoder.heicTo).toHaveBeenCalledWith({blob:file,type:'image/jpeg',quality:.95});
    expect(decode).toHaveBeenCalledTimes(2);expect(photo.group).toBe('mom');expect(photo.blob.type).toBe('image/jpeg');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:original');expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:converted');
  });
  it('detects HEIC bytes even when the file has no MIME type or extension',async()=>{
    decode.mockRejectedValueOnce(new Error('Unsupported'));
    await preparePhoto(new File(['0000ftypheic'],'photo'),'memories','Kỷ niệm');
    expect(decoder.heicTo).toHaveBeenCalledOnce();
    expect(draw.mock.calls[0].slice(-2)).toEqual([960,1280]);
  });
  it('rejects broken HEIC without returning a photo and releases the source URL',async()=>{
    decode.mockRejectedValueOnce(new Error('Unsupported'));decoder.heicTo.mockRejectedValueOnce(new Error('Bad data'));
    await expect(preparePhoto(new File(['bad'],'broken.heic'),'mom','Mẹ')).rejects.toThrow('Chưa đọc được ảnh HEIC');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:original');
  });
  it('reports invalid ordinary images without loading the HEIC converter',async()=>{
    decode.mockRejectedValueOnce(new Error('Unsupported'));
    await expect(preparePhoto(new File(['bad'],'broken.jpg'),'mom','Mẹ')).rejects.toThrow('Không đọc được ảnh');
    expect(decoder.heicTo).not.toHaveBeenCalled();
  });
});
