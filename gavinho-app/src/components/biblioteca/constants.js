import {
  Box, Sparkles, Mountain, Trees, Layers, Grid, Shirt, Square,
  Sofa, Lamp, Bath, ChefHat, TreePalm, Building, Bed, Monitor, ZoomIn
} from 'lucide-react'

export const TABS = [
  { id: 'materiais', label: 'Materiais', icon: Layers },
  { id: 'modelos3d', label: 'Modelos 3D', icon: Box },
  { id: 'inspiracao', label: 'Inspiração', icon: Sparkles }
]

export const FORMATOS_3D = ['.obj', '.fbx', '.skp', '.3ds', '.blend', '.glb', '.gltf', '.zip', '.rar']

export const ICON_MAP = {
  'mountain': Mountain,
  'trees': Trees,
  'layers': Layers,
  'grid-3x3': Grid,
  'shirt': Shirt,
  'square': Square,
  'sofa': Sofa,
  'lamp': Lamp,
  'bath': Bath,
  'chef-hat': ChefHat,
  'tree-palm': TreePalm,
  'building': Building,
  'bed': Bed,
  'monitor': Monitor,
  'zoom-in': ZoomIn,
  'box': Box,
  'flower-2': Sparkles
}
