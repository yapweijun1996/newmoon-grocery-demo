"""Shared metre-scale modelling tools. Each SKU has its own headless entry point."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
from math import pi, sin, cos

ROOT = Path(__file__).resolve().parent
CAT = json.loads((ROOT/'catalog.json').read_text())

def linear(c):
    v=int(c,16)/255
    return v/12.92 if v<=0.04045 else ((v+.055)/1.055)**2.4

def material(name,hexcode,metal=0,rough=.44):
    m=bpy.data.materials.new(name); m.use_nodes=True; s=m.node_tree.nodes.get('Principled BSDF'); col=tuple(linear(hexcode[k:k+2]) for k in (0,2,4))+(1,)
    s.inputs['Base Color'].default_value=col; m.diffuse_color=col; s.inputs['Metallic'].default_value=metal; s.inputs['Roughness'].default_value=rough; return m

def bind(o,n,m):
    o.name=n; o.data.materials.append(m); return o

def mesh(n,vs,fs,m):
    data=bpy.data.meshes.new(n); data.from_pydata(vs,[],fs); data.update(); o=bpy.data.objects.new(n,data); bpy.context.collection.objects.link(o); return bind(o,n,m)

def cube(n,p,d,m,bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p); o=bpy.context.object; o.dimensions=d; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); bind(o,n,m)
    if bevel:
        mod=o.modifiers.new('Soft folded edge','BEVEL'); mod.width=bevel; mod.segments=3
        bpy.ops.object.modifier_apply(modifier=mod.name); mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL'); bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def turned(n,x,y,z,profile,m,count=64,flutes=0):
    vs=[]; fs=[]
    for h,r in profile:
        for j in range(count):
            a=2*pi*j/count; rr=r*(1+(.022 if j%2 else 0)*flutes); vs.append((x+rr*cos(a),y+rr*sin(a),z+h))
    for i in range(len(profile)-1):
        for j in range(count):
            a=i*count+j;b=i*count+(j+1)%count;fs.append((a,b,b+count,a+count))
    fs.extend([tuple(reversed(range(count))),tuple(range(len(vs)-count,len(vs)))]); o=mesh(n,vs,fs,m)
    for f in list(o.data.polygons)[:-2]: f.use_smooth=True
    return o

def wire(n,pts,r,m,loop=False):
    c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.resolution_u=1;c.bevel_depth=r;c.bevel_resolution=2;c.use_fill_caps=True; s=c.splines.new('POLY');s.points.add(len(pts)-1)
    for pp,co in zip(s.points,pts):pp.co=(*co,1)
    s.use_cyclic_u=loop;o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);bind(o,n,m);return o

def hoop(n,x,y,z,rx,ry,r,m):return wire(n,[(x+rx*cos(j*pi/40),y+ry*sin(j*pi/40),z) for j in range(80)],r,m,True)

def paper(i,x,y,z,w,h,r=0):
    # A cylindrical patch faces -Y; the back seam remains free of stretching.
    steps=32 if r else 1; vs=[]; fs=[]; uvs=[]
    for j in range(steps+1):
        u=j/steps; a=(u-.5)*w/r if r else 0; X=x+(r*sin(a) if r else (u-.5)*w); Y=y-r*cos(a) if r else y
        vs.extend([(X,Y,z),(X,Y,z+h)]); uvs.extend([(u,0),(u,1)])
        if j: k=2*j; fs.append((k-2,k,k+1,k-1))
    o=mesh('Letterpress panel',vs,fs,labels[i]); uv=o.data.uv_layers.new(name='UVMap');
    for l in o.data.loops: uv.data[l.index].uv=uvs[l.vertex_index]
    for f in o.data.polygons:f.use_smooth=True

def tin(x,y,z,s=1):
    def turn(name,p,m):return turned(name,x,y,z,[(h*s,r*s) for h,r in p],m)
    turn('Lacquered steel',[(0,.049),(.003,.052),(.009,.05),(.089,.05),(.093,.052),(.096,.052)],wine)
    for h in [.004,.014,.083,.094]:hoop('Rolled brass seam',x,y,z+h*s,.051*s,.051*s,.0016*s,gold)
    turn('Pressed lid',[(.094,.051),(.097,.049),(.096,.046),(.094,.044),(.095,.04)],gold)
    for r in [.034,.038]:hoop('Concentric embossing',x,y,z+.0958*s,r*s,r*s,.00065*s,pale)
    hoop('Ring pull',x,y+.009*s,z+.097*s,.01*s,.014*s,.002*s,pale);paper(0,x,y,z+.016*s,.139*s,.065*s,.0504*s)

def essence(x,y,z):
    turned('Polished amber glass',x,y,z,[(0,.021),(.002,.024),(.008,.025),(.083,.025),(.09,.024),(.098,.019),(.103,.014),(.116,.013)],amber)
    turned('Blush enamel cap',x,y,z,[(.109,.015),(.112,.016),(.135,.016),(.137,.015)],blush,96,1)
    for h in [.109,.113,.134]:hoop('Cap gilt',x,y,z+h,.0164,.0164,.001,gold)
    paper(1,x,y,z+.021,.073,.059,.02525)

def jar(x,y,z):
    turned('Honey-coloured preserve glass',x,y,z,[(0,.031),(.002,.035),(.007,.038),(.015,.039),(.057,.039),(.065,.0375),(.07,.034),(.076,.033)],honey)
    turned('Satin brass closure',x,y,z,[(.071,.036),(.073,.038),(.083,.038),(.087,.036)],gold,112,1)
    hoop('Closure bead',x,y,z+.084,.037,.037,.0014,pale);hoop('Shoulder bead',x,y,z+.011,.0385,.0385,.0012,honey); paper(2,x,y,z+.014,.111,.046,.03935)

def carton(x,y,z,s=1):
    def box(n,h,d,m,b=.001):return cube(n,(x,y,z+h*s),tuple(v*s for v in d),m,b*s)
    box('Book carton',.085,(.104,.061,.17),jade);box('Top telescopic lid',.163,(.106,.063,.015),teal)
    for h in [.009,.014,.155]:box('Foil rule',h,(.1048,.0618,.0014),gold,.0004)
    paper(3,x,y-.031*s,z+.047*s,.095*s,.085*s); box('Linen belly band',.032,(.105,.062,.009),teal)

def case():
    cube('Magnetic case base',(0,0,.012),(.246,.135,.024),teal,.004);cube('Case foot',(0,0,.003),(.238,.128,.006),jade)
    cube('Upright presentation lid',(0,.062,.079),(.245,.011,.154),wine,.004)
    for x in [-.117,.117]: cube('Gilded inner border',(x,.0558,.083),(.0018,.0008,.13),gold,.0004)
    for h in [.019,.147]:cube('Gilded inner border',(0,.0557,h),(.236,.0008,.0018),gold,.0004)
    paper(0,0,.055,.089,.093,.054)
    for x in [-.059,.059]:tin(x,-.003,.022)
    for x in [-.119,.119]:cube('Velvet cheek',(x,-.001,.025),(.008,.13,.044),jade)
    cube('Verdigris front rail',(0,-.063,.022),(.244,.008,.041),teal)
    for h in [.006,.038]:cube('Foil edge',(0,-.0672,h),(.235,.0005,.0016),gold,.0003)
    cube('Brass clasp',(0,-.068,.024),(.029,.003,.012),gold,.002)

def hamper():
    # Elliptical willow courses pass alternately in front of and behind the stakes.
    rx,ry=.164,.103; n=48; rows=14
    def scale(t):return .74+.26*t
    def co(a,t,offset=0):return ((rx*scale(t)+offset)*cos(a),(ry*scale(t)+offset)*sin(a),.006+.108*t)
    for j in range(n):wire('Upright willow', [co(2*pi*j/n,t) for t in (0,.5,1)],.0028,cane2)
    for k in range(rows):
        t=k/(rows-1); pts=[co(2*pi*j/(n*4),t,.0029*cos(pi*j/4+k*pi)) for j in range(n*4)];wire('Woven willow',pts,.0037,cane if k%4 else cane2,True)
    # Open lining and pleated tissue, with the paper rising behind the gifts.
    vs=[co(j*2*pi/80,t,-.004) for t in (0,.97) for j in range(80)];mesh('Lined basket',vs,[tuple(reversed(range(80)))]+[(j,(j+1)%80,(j+1)%80+80,j+80) for j in range(80)],umber)
    tissue=material('Folded cream tissue','dfcaa2',0,.82);vs=[];fs=[];nfolds=64
    for ring in range(3):
        for j in range(nfolds):
            a=2*pi*j/nfolds; pleat=cos(j*pi); scale2=(.35,.75,.93)[ring]+.017*pleat; h=(.08,.089,.103)[ring]+ring*(.002*pleat+.003*sin(a*7))
            if ring==2: h+=.036*max(sin(a),0)**2*(.75+.25*cos(4*a))
            vs.append((rx*scale2*cos(a),ry*scale2*sin(a),h))
    for k in range(2):
        for j in range(nfolds):
            a=k*nfolds+j;b=k*nfolds+(j+1)%nfolds;fs.extend([(a,a+nfolds,b+nfolds),(a,b+nfolds,b)])
    mesh('Fan-folded paper lining',vs,fs+[tuple(range(nfolds))],tissue)
    for t in [0,1]:hoop('Bound basket rim',0,0,.006+.108*t,rx*scale(t),ry*scale(t),.006,cane2)
    for off in [-.0028,.0028]:
        pts=[((rx+off)*cos(a*pi/100),.011,.108+(.201+off)*sin(a*pi/100)) for a in range(101)];wire('Split-cane handle',pts,.0048,cane)
    carton(-.048,.034,.089,.91);tin(-.083,-.028,.104,.85);jar(.042,-.044,.103);essence(.078,.025,.102)
    # Double grosgrain bow tied at the right handle shoulder, with two falling tails.
    x,y,z=.142,-.007,.210
    for side in [-1,1]:
        vs=[];fs=[]
        for j in range(49):
            a=2*pi*j/48;xx=x+side*.024*(1-cos(a)); yy=y+.010*sin(a); zz=z+.017*sin(a)+.012*(1-cos(a));vs.extend([(xx,yy-.002,zz-.005),(xx,yy+.002,zz+.005)])
            if j: k=2*j;fs.append((k-2,k,k+1,k-1))
        mesh('Oxblood grosgrain bow',vs,fs,wine);pts=[(x,y,z),(x+side*.014,y-.003,z-.021),(x+side*.022,y-.009,z-.05),(x+side*.019,y-.005,z-.066)];vs=[(a+q*.006,b,c+q*.002) for a,b,c in pts for q in (-1,1)];mesh('Ribbon tail',vs,[(j,j+2,j+3,j+1) for j in (0,2,4)],wine)
    cube('Knot',(x,y-.001,z),(.016,.012,.016),wine,.004); cube('Paper swing tag',(0,-.104,.086),(.086,.002,.059),wine);paper(4,0,-.1052,.059,.082,.054)

def shelf():
    cube('Plinth',(0,0,.046),(.59,.335,.092),jade,.014);cube('Brass kickplate',(0,0,.021),(.584,.33,.016),gold)
    cube('Lacquered spine',(0,.134,.725),(.57,.039,1.35),teal,.02)
    for x in [-.273,.273]:cube('Brass stile',(x,.111,.78),(.004,.003,1.16),gold)
    for z in [.14,.53,.92]:
        cube('Timber shelf',(0,-.006,z),(.588,.322,.032),cane2,.008);cube('Shelf ticket channel',(0,-.168,z+.002),(.578,.008,.022),jade)
        for x in [-.273,.273]:wire('Brass gallery return',[(x,-.14,z+.016),(x,-.14,z+.061),(x,.11,z+.061)],.0045,gold)
        for j,x in enumerate([-.181,-.061,.061,.181]):
            if z==.14:tin(x,-.052,z+.016)
            elif z==.53:carton(x,-.054,z+.016)
            else:jar(x,-.04,z+.016)
    cube('Header cartouche',(0,.104,1.284),(.52,.025,.184),jade,.015);paper(5,0,.0908,1.199,.343,.171)

GENERATORS=[case,lambda:essence(0,0,0),lambda:jar(0,0,0),lambda:carton(0,0,0),hamper,shelf]

def build(slug):
    global labels,wine,gold,pale,teal,jade,cane,cane2,blush,amber,honey,umber
    i=next(j for j,p in enumerate(CAT) if p['slug']==slug);out=ROOT/slug;bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.unit_settings.system='METRIC'
    wine=material('Mulberry lacquer','792f40',.2,.32);gold=material('Brushed champagne brass','c59552',.72,.32);pale=material('Light gold highlights','ead095',.66,.28);teal=material('Deep pine bookcloth','164b48');jade=material('Jade enamel','39665b',.15);cane=material('Golden split cane','c39158');cane2=material('Toasted rattan','a37249');umber=material('Cocoa basket lining','5f4739');blush=material('Rose anodised aluminium','cb917e',.66,.32);amber=material('Burnished amber glass','884027',.17,.16);honey=material('Golden preserve glass','cc975a',.13,.21)
    labels=[]
    for p in CAT:
        m=material('Letterpress • '+p['name'],'ffffff');m.use_backface_culling=True;tex=m.node_tree.nodes.new('ShaderNodeTexImage');uvnode=m.node_tree.nodes.new('ShaderNodeUVMap');uvnode.uv_map='UVMap';m.node_tree.links.new(uvnode.outputs['UV'],tex.inputs['Vector']);tex.image=bpy.data.images.load(str(ROOT/p['slug']/'label.png'),check_existing=True);m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color']);labels.append(m)
    GENERATORS[i]();bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=bpy.context.selected_objects[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();obj=bpy.context.object;obj.data.uv_layers.active_index=obj.data.uv_layers.find('UVMap');obj.data.uv_layers.active.active_render=True;bpy.ops.object.origin_set(type='ORIGIN_CURSOR');obj.name=CAT[i]['name'];obj['origin_note']='Base centre, metre units';obj['artwork']='NEW MOON (placeholder pack art)';obj.data.name=slug
    bpy.ops.export_scene.gltf(filepath=str(out/'model.glb'),export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=7,export_draco_position_quantization=16)
    # Transparent, orthographic catalogue previews, using the same physical object.
    pts=[obj.matrix_world@Vector(p) for p in obj.bound_box];ctr=sum(pts,Vector((0,0,0)))/8;size=max(obj.dimensions);scene.world=bpy.data.worlds.new('Soft ivory bounce');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.66,.57,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.65
    def aim(o):o.rotation_euler=(ctr-o.location).to_track_quat('-Z','Y').to_euler()
    for j,(loc,power,span) in enumerate([((-1.5,-2,2.8),145,2),((2,-1,1.4),65,1.4),((.4,1.7,2),120,1.2)]):
        bpy.ops.object.light_add(type='AREA',location=ctr+Vector(loc)*size);o=bpy.context.object;o.data.energy=power*size**2;o.data.shape='DISK';o.data.size=size*span;aim(o)
    bpy.ops.object.camera_add(location=ctr+Vector((.95,-2.9,1.22 if i not in (1,2,5) else .91))*size);o=bpy.context.object;aim(o);scene.camera=o;o.data.type='ORTHO';o.data.clip_start=.001;o.data.ortho_scale=size*(1.26 if i!=5 else 1.14)
    scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.render.film_transparent=True;scene.render.resolution_x=scene.render.resolution_y=440;scene.render.image_settings.compression=98;scene.render.resolution_percentage=100;scene.render.image_settings.color_mode='RGBA';scene.render.image_settings.color_depth='8';scene.render.filepath=str(out/'preview.png');bpy.ops.render.render(write_still=True)
