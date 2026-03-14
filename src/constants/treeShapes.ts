export interface TreeShapePreset {
  id: string;
  svgPathData: string;
  trunkPathData?: string;
  detailPathData?: string;
  colorPalette: {
    trunk: string;
    leaves: string;
    accent?: string;
  };
}

export const PRESET_TREE_SHAPES: TreeShapePreset[] = [
  {
    id: 'pine-classic',
    svgPathData: 'M110 30 L166 114 L134 114 L178 172 L136 172 L162 220 L58 220 L84 172 L42 172 L86 114 L54 114 Z',
    trunkPathData: 'M98 220 L122 220 L122 256 L98 256 Z',
    detailPathData: 'M86 102 L112 74 M72 136 L112 106 M64 170 L112 138 M138 138 L160 170 M146 106 L164 136 M138 74 L160 102',
    colorPalette: {
      trunk: '#8A4F17',
      leaves: '#1EB554',
      accent: '#85DB8E',
    },
  },
  {
    id: 'round-lime',
    svgPathData: 'M66 206 C44 196,30 170,34 146 C38 122,58 108,84 108 C90 88,110 74,132 78 C154 82,168 100,168 122 C186 132,194 150,190 170 C186 190,168 206,146 208 Z',
    trunkPathData: 'M103 206 L123 206 L123 256 L103 256 Z',
    detailPathData: 'M94 142 C102 134,116 134,124 142 M82 168 C100 158,126 158,142 170',
    colorPalette: {
      trunk: '#3E7D38',
      leaves: '#9ED94C',
      accent: '#D2EE85',
    },
  },
  {
    id: 'autumn-round',
    svgPathData: 'M68 208 C48 194,36 170,40 146 C44 122,62 106,84 102 C86 82,102 68,124 68 C146 68,164 84,168 104 C188 112,202 130,200 152 C198 176,180 196,158 208 Z',
    trunkPathData: 'M102 208 L126 208 L126 256 L102 256 Z',
    detailPathData: 'M98 124 C108 114,122 114,132 124 M92 152 C110 144,124 144,140 154',
    colorPalette: {
      trunk: '#7C4A26',
      leaves: '#A85A24',
      accent: '#D69354',
    },
  },
  {
    id: 'yellow-poplar',
    svgPathData: 'M70 210 C52 198,42 178,44 156 C46 134,62 116,82 110 C82 90,98 74,120 74 C142 74,160 92,160 114 C178 122,190 138,190 158 C190 184,172 204,148 212 Z',
    trunkPathData: 'M104 210 L124 210 L124 256 L104 256 Z',
    detailPathData: 'M108 112 C116 104,126 104,134 112 M94 148 C110 140,126 140,142 150',
    colorPalette: {
      trunk: '#5A381E',
      leaves: '#F7DD4A',
      accent: '#FFF59A',
    },
  },
  {
    id: 'red-maple-star',
    svgPathData: 'M112 58 L124 84 L152 70 L146 98 L174 102 L154 122 L170 146 L142 142 L136 170 L112 152 L88 170 L82 142 L54 146 L70 122 L50 102 L78 98 L72 70 L100 84 Z',
    trunkPathData: 'M106 152 L118 152 L118 256 L106 256 Z',
    detailPathData: 'M112 90 L112 160 M94 108 L112 124 L130 108 M84 132 L112 136 L140 132',
    colorPalette: {
      trunk: '#4A2A21',
      leaves: '#F21F1F',
      accent: '#FF6D6D',
    },
  },
  {
    id: 'spruce-dark',
    svgPathData: 'M112 38 L162 122 L132 122 L168 178 L132 178 L154 220 L70 220 L92 178 L56 178 L92 122 L62 122 Z',
    trunkPathData: 'M98 220 L122 220 L122 256 L98 256 Z',
    detailPathData: 'M82 118 C94 110,130 110,142 118 M72 148 C90 140,134 140,150 148 M68 176 C88 168,136 168,154 176',
    colorPalette: {
      trunk: '#8A4F17',
      leaves: '#0A6B48',
      accent: '#3EC38A',
    },
  },
  {
    id: 'blossom-white',
    svgPathData: 'M70 214 C50 198,38 172,42 148 C46 124,66 108,90 106 C92 86,108 74,130 76 C152 78,168 96,170 118 C190 126,202 144,200 166 C198 190,180 210,156 216 Z',
    trunkPathData: 'M104 214 L124 214 L124 256 L104 256 Z',
    detailPathData: 'M86 142 C92 136,100 136,106 142 M116 132 C122 126,130 126,136 132 M144 146 C150 140,158 140,164 146',
    colorPalette: {
      trunk: '#7A4C20',
      leaves: '#F8F8EF',
      accent: '#DCE3C8',
    },
  },
  {
    id: 'teardrop-cedar',
    svgPathData: 'M112 40 C90 44,72 72,72 110 C72 152,88 190,112 220 C136 190,152 152,152 110 C152 72,134 44,112 40 Z',
    trunkPathData: 'M106 220 L118 220 L118 256 L106 256 Z',
    detailPathData: 'M100 84 L112 66 L124 84 M96 118 L112 96 L128 118 M94 150 L112 130 L130 150 M90 182 L112 164 L134 182',
    colorPalette: {
      trunk: '#4F4B43',
      leaves: '#0F7A36',
      accent: '#2BAA52',
    },
  },
  {
    id: 'weeping-willow',
    svgPathData: 'M72 136 C76 106,94 88,114 88 C134 88,152 106,156 136 C156 166,146 192,132 212 C124 224,100 224,92 212 C78 192,68 166,72 136 Z',
    trunkPathData: 'M106 188 L122 188 L124 256 L104 256 Z',
    detailPathData: 'M88 132 C82 160,82 188,86 218 M102 128 C98 158,98 192,100 222 M122 128 C126 160,126 192,124 222 M138 132 C142 160,142 188,138 218',
    colorPalette: {
      trunk: '#8B5D34',
      leaves: '#B8CF70',
      accent: '#D7E6A5',
    },
  },
  {
    id: 'palm-tropical',
    svgPathData: 'M112 94 C88 98,70 110,56 124 C78 120,96 126,112 140 C126 120,146 108,168 106 C150 118,138 136,130 154 C148 142,170 140,192 146 C172 154,152 166,138 182 C154 178,176 182,196 194 C172 196,150 202,130 214 C118 200,104 200,94 214 C74 202,52 196,28 194 C48 182,70 178,86 182 C72 166,52 154,32 146 C54 140,76 142,94 154 C86 136,74 118,56 106 C78 108,98 120,112 140 Z',
    trunkPathData: 'M104 140 C112 154,118 172,122 194 C126 216,126 238,122 256 L100 256 C96 236,96 214,100 192 C104 170,108 154,104 140 Z',
    detailPathData: 'M104 164 L120 164 M106 186 L122 186 M108 208 L122 208 M108 230 L120 230',
    colorPalette: {
      trunk: '#C8842B',
      leaves: '#1D2E2E',
      accent: '#6A8F8F',
    },
  },
  {
    id: 'cherry-blossom',
    svgPathData: 'M72 214 C52 196,40 170,44 146 C48 122,66 106,90 102 C94 82,108 70,130 72 C152 74,168 92,170 114 C190 122,202 140,200 162 C198 186,180 208,156 216 Z',
    trunkPathData: 'M104 214 L124 214 L124 256 L104 256 Z',
    detailPathData: 'M84 148 C90 140,98 140,104 148 M100 132 C108 124,118 124,126 132 M126 148 C132 140,142 140,148 148 M146 132 C154 124,164 124,172 132',
    colorPalette: {
      trunk: '#7A4A34',
      leaves: '#F6C2CF',
      accent: '#FFDCE6',
    },
  },
  {
    id: 'orange-watercolor',
    svgPathData: 'M62 216 C40 198,30 168,38 140 C46 112,68 94,96 92 C108 72,130 66,152 74 C174 82,188 102,190 126 C206 136,214 154,210 174 C206 200,186 218,160 224 Z',
    trunkPathData: 'M106 214 L126 214 L126 256 L106 256 Z',
    detailPathData: 'M94 124 C104 114,118 114,128 124 M118 124 C132 118,146 118,158 128',
    colorPalette: {
      trunk: '#6E3A2A',
      leaves: '#FF6A1C',
      accent: '#FFAE6A',
    },
  },
  {
    id: 'pear-soft',
    svgPathData: 'M74 214 C56 198,44 178,46 154 C48 130,64 114,86 108 C90 86,108 74,130 76 C152 78,168 96,170 120 C188 130,198 146,196 166 C194 190,176 210,154 216 Z',
    trunkPathData: 'M106 214 L124 214 L124 256 L106 256 Z',
    detailPathData: 'M102 128 C110 118,122 118,130 128 M90 154 C108 146,126 146,142 156',
    colorPalette: {
      trunk: '#8C5834',
      leaves: '#A8D86D',
      accent: '#D8EFA6',
    },
  },
  {
    id: 'olive-rounded',
    svgPathData: 'M72 214 C54 198,42 176,44 152 C46 128,64 112,88 106 C92 86,108 74,128 74 C148 74,164 90,168 112 C186 120,198 136,198 156 C198 180,182 202,160 214 Z',
    trunkPathData: 'M106 214 L122 214 L124 256 L104 256 Z',
    detailPathData: 'M86 142 C94 136,102 136,110 142 M128 132 C136 126,146 126,154 132 M96 168 C112 160,132 160,146 170',
    colorPalette: {
      trunk: '#7A5337',
      leaves: '#5FAF6A',
      accent: '#8DD095',
    },
  },
  {
    id: 'fir-slim',
    svgPathData: 'M112 34 L148 96 L126 96 L156 140 L130 140 L164 186 L132 186 L150 220 L74 220 L92 186 L60 186 L94 140 L68 140 L98 96 L76 96 Z',
    trunkPathData: 'M102 220 L122 220 L122 256 L102 256 Z',
    detailPathData: 'M84 98 C96 92,126 92,138 98 M74 136 C92 128,130 128,148 136 M66 176 C88 168,136 168,156 176',
    colorPalette: {
      trunk: '#8A4D23',
      leaves: '#0F8A4B',
      accent: '#63CF8B',
    },
  },
  {
    id: 'cypress-column',
    svgPathData: 'M112 42 C90 46,74 74,74 112 C74 150,88 188,112 222 C136 188,150 150,150 112 C150 74,134 46,112 42 Z',
    trunkPathData: 'M106 222 L118 222 L118 256 L106 256 Z',
    detailPathData: 'M98 86 L112 66 L126 86 M96 118 L112 100 L128 118 M94 150 L112 132 L130 150 M92 182 L112 166 L132 182',
    colorPalette: {
      trunk: '#5A4C3F',
      leaves: '#0D6C3A',
      accent: '#38A65E',
    },
  },
  {
    id: 'apple-fruit',
    svgPathData: 'M70 214 C52 198,40 176,42 152 C44 128,62 110,84 104 C90 84,108 72,130 72 C152 72,168 90,170 114 C188 124,198 140,198 160 C198 184,182 204,160 214 Z',
    trunkPathData: 'M104 214 L124 214 L124 256 L104 256 Z',
    detailPathData: 'M96 138 C104 130,116 130,124 138 M130 154 C136 146,146 146,152 154 M84 160 C90 152,98 152,104 160',
    colorPalette: {
      trunk: '#7A4A2A',
      leaves: '#1D8A45',
      accent: '#F1D74A',
    },
  },
  {
    id: 'maple-wide',
    svgPathData: 'M64 216 C44 200,34 172,40 146 C46 120,66 104,90 102 C98 84,114 72,134 74 C154 76,170 92,174 114 C196 124,208 142,206 164 C204 190,184 210,160 218 Z',
    trunkPathData: 'M104 216 L124 216 L124 256 L104 256 Z',
    detailPathData: 'M92 134 C104 122,122 122,134 134 M82 164 C102 154,132 154,150 166',
    colorPalette: {
      trunk: '#6D422B',
      leaves: '#E45F19',
      accent: '#FFB36D',
    },
  },
  {
    id: 'sakura-cloud',
    svgPathData: 'M72 216 C52 198,40 172,44 148 C48 124,66 108,90 104 C94 84,110 72,130 74 C150 76,166 92,170 114 C190 122,202 140,202 162 C202 188,184 210,160 218 Z',
    trunkPathData: 'M106 216 L124 216 L124 256 L106 256 Z',
    detailPathData: 'M92 146 C98 138,106 138,112 146 M122 136 C130 128,140 128,148 136 M140 158 C148 150,158 150,166 158',
    colorPalette: {
      trunk: '#7A5340',
      leaves: '#F7B5CA',
      accent: '#FFD8E7',
    },
  },
  {
    id: 'cedar-layered',
    svgPathData: 'M112 38 L150 100 L128 100 L158 144 L132 144 L164 190 L132 190 L148 220 L76 220 L92 190 L60 190 L92 144 L66 144 L96 100 L74 100 Z',
    trunkPathData: 'M102 220 L122 220 L122 256 L102 256 Z',
    detailPathData: 'M82 104 C94 98,128 98,142 104 M72 144 C92 136,132 136,150 144 M64 184 C86 176,136 176,154 184',
    colorPalette: {
      trunk: '#845024',
      leaves: '#1B7F49',
      accent: '#A8E2B7',
    },
  },
  {
    id: 'cedar-mint',
    svgPathData: 'M112 42 L146 98 L126 98 L154 138 L130 138 L160 180 L130 180 L146 220 L78 220 L94 180 L64 180 L94 138 L70 138 L98 98 L78 98 Z',
    trunkPathData: 'M102 220 L120 220 L120 256 L102 256 Z',
    detailPathData: 'M84 100 C96 94,126 94,138 100 M76 138 C92 130,128 130,146 138 M68 178 C88 170,132 170,150 178',
    colorPalette: {
      trunk: '#7C532A',
      leaves: '#59B592',
      accent: '#A2DEC6',
    },
  },
  {
    id: 'canopy-bubble',
    svgPathData: 'M66 216 C48 202,38 180,42 158 C46 136,62 120,84 114 C88 94,104 82,124 82 C144 82,160 96,164 116 C182 126,194 142,194 160 C194 186,176 206,154 216 Z',
    trunkPathData: 'M104 216 L126 216 L126 256 L104 256 Z',
    detailPathData: 'M90 146 C100 136,112 136,122 146 M122 152 C130 144,142 144,150 152',
    colorPalette: {
      trunk: '#7A4F2D',
      leaves: '#3DB373',
      accent: '#7CD9A0',
    },
  },
  {
    id: 'ginkgo-fan',
    svgPathData: 'M74 214 C54 198,42 176,46 152 C50 128,68 110,92 104 C96 88,110 78,124 80 C138 82,150 92,154 106 C174 112,188 128,188 148 C188 174,172 196,150 210 Z',
    trunkPathData: 'M106 210 L124 210 L124 256 L106 256 Z',
    detailPathData: 'M102 118 L106 168 M112 112 L112 172 M122 114 L118 170 M132 122 L124 166',
    colorPalette: {
      trunk: '#7B4A21',
      leaves: '#F2D64B',
      accent: '#FFF09B',
    },
  },
  {
    id: 'birch-white',
    svgPathData: 'M72 214 C54 198,42 174,44 150 C46 126,64 108,88 102 C92 84,108 74,128 74 C148 74,164 90,168 112 C186 120,198 136,198 156 C198 182,182 202,158 214 Z',
    trunkPathData: 'M104 214 L124 214 L124 256 L104 256 Z',
    detailPathData: 'M106 218 L112 246 M118 220 L114 244 M108 178 L120 176 M102 196 L118 194 M110 154 L124 152',
    colorPalette: {
      trunk: '#F1EEE6',
      leaves: '#EFF6DE',
      accent: '#D8E9B8',
    },
  },
  {
    id: 'plum-pink',
    svgPathData: 'M70 216 C50 200,38 174,42 150 C46 126,64 108,88 102 C94 82,110 70,132 72 C154 74,170 92,174 114 C194 122,206 140,206 162 C206 188,186 210,160 218 Z',
    trunkPathData: 'M106 216 L124 216 L124 256 L106 256 Z',
    detailPathData: 'M96 140 C102 132,110 132,116 140 M122 132 C130 124,138 124,146 132 M142 148 C148 140,156 140,162 148',
    colorPalette: {
      trunk: '#735042',
      leaves: '#F39BBB',
      accent: '#FFD0E0',
    },
  },
  {
    id: 'cedar-blue',
    svgPathData: 'M112 38 L148 102 L126 102 L156 146 L130 146 L162 190 L130 190 L146 220 L78 220 L94 190 L62 190 L94 146 L68 146 L98 102 L76 102 Z',
    trunkPathData: 'M102 220 L122 220 L122 256 L102 256 Z',
    detailPathData: 'M84 104 C96 98,128 98,140 104 M74 146 C92 138,130 138,148 146 M66 186 C86 178,134 178,152 186',
    colorPalette: {
      trunk: '#7A542F',
      leaves: '#2E8D86',
      accent: '#8FD7CE',
    },
  },
  {
    id: 'maple-crimson',
    svgPathData: 'M64 216 C42 200,32 170,40 142 C48 114,70 96,96 94 C108 74,132 68,154 78 C176 88,190 108,192 132 C210 142,218 158,214 178 C210 204,188 220,162 224 Z',
    trunkPathData: 'M106 216 L126 216 L126 256 L106 256 Z',
    detailPathData: 'M94 130 C106 120,122 120,134 130 M88 158 C110 148,136 148,156 162',
    colorPalette: {
      trunk: '#6B3E2B',
      leaves: '#E4312B',
      accent: '#FF9A7D',
    },
  },
  {
    id: 'moss-round',
    svgPathData: 'M74 216 C56 200,44 178,46 156 C48 134,64 118,86 112 C92 90,108 80,126 80 C144 80,160 96,164 118 C182 126,194 142,194 162 C194 188,176 208,154 216 Z',
    trunkPathData: 'M106 216 L124 216 L124 256 L106 256 Z',
    detailPathData: 'M92 148 C100 140,110 140,118 148 M124 140 C132 132,142 132,150 140 M100 170 C114 162,132 162,146 172',
    colorPalette: {
      trunk: '#7A4F2F',
      leaves: '#7FBF5D',
      accent: '#BEE39C',
    },
  },
  {
    id: 'oak-broad',
    svgPathData: 'M54 214 C36 198,30 170,38 144 C46 118,68 104,94 102 C96 82,114 70,138 72 C162 74,178 92,182 116 C202 122,214 142,210 168 C206 194,184 212,158 220 Z',
    trunkPathData: 'M102 214 L128 214 L128 256 L102 256 Z',
    detailPathData: 'M88 138 C100 128,118 128,130 138 M118 126 C130 118,146 118,156 130 M94 164 C114 154,138 154,156 166',
    colorPalette: {
      trunk: '#6F472C',
      leaves: '#6FA94C',
      accent: '#B6D985',
    },
  },
  {
    id: 'beech-copper',
    svgPathData: 'M68 216 C48 198,38 170,42 144 C46 118,64 102,88 98 C96 78,114 68,136 70 C158 72,174 90,176 114 C196 122,208 140,206 162 C204 190,184 212,160 220 Z',
    trunkPathData: 'M104 216 L126 216 L126 256 L104 256 Z',
    detailPathData: 'M92 138 C102 128,116 128,126 138 M126 134 C136 126,148 126,158 136 M96 166 C116 156,138 156,154 168',
    colorPalette: {
      trunk: '#7B4B2E',
      leaves: '#C17A3F',
      accent: '#E5B06E',
    },
  },
  {
    id: 'aspen-quiver',
    svgPathData: 'M78 216 C60 200,50 178,52 154 C54 130,70 114,90 108 C92 90,106 78,124 78 C142 78,156 92,160 112 C178 120,188 138,188 158 C188 184,172 204,150 216 Z',
    trunkPathData: 'M108 210 L122 210 L122 256 L108 256 Z',
    detailPathData: 'M108 112 L112 176 M118 112 L116 180 M100 150 C108 144,120 144,128 152',
    colorPalette: {
      trunk: '#EEE8DE',
      leaves: '#D8C94F',
      accent: '#F6E89C',
    },
  },
  {
    id: 'elm-vase',
    svgPathData: 'M78 216 C58 198,46 174,48 150 C50 126,66 108,90 104 C98 82,114 70,132 72 C150 74,166 88,170 108 C188 118,200 136,198 156 C196 182,180 204,156 216 Z',
    trunkPathData: 'M106 212 C102 228,102 242,104 256 L124 256 C126 242,126 226,122 212 Z',
    detailPathData: 'M96 134 C108 124,124 124,136 134 M86 162 C106 152,132 152,150 164',
    colorPalette: {
      trunk: '#83512C',
      leaves: '#5C9E57',
      accent: '#A7D096',
    },
  },
  {
    id: 'chestnut-amber',
    svgPathData: 'M62 216 C42 198,32 170,38 142 C44 114,68 98,96 94 C108 74,128 66,150 72 C172 78,188 96,192 120 C208 130,216 148,212 170 C208 198,186 218,158 224 Z',
    trunkPathData: 'M106 216 L126 216 L126 256 L106 256 Z',
    detailPathData: 'M94 128 C106 118,122 118,134 128 M126 126 C138 120,150 120,160 132 M92 160 C112 150,140 150,160 166',
    colorPalette: {
      trunk: '#734523',
      leaves: '#A86A2F',
      accent: '#E1A255',
    },
  },
  {
    id: 'oak-bare-winter',
    svgPathData: 'M110 108 C96 132,82 142,72 170 C64 190,74 204,92 204 C98 182,102 166,110 150 C118 166,122 182,128 204 C148 204,158 190,150 170 C140 142,126 132,110 108 Z',
    trunkPathData: 'M102 140 C96 172,96 214,100 256 L126 256 C130 214,130 172,122 140 Z',
    detailPathData: 'M112 84 L112 166 M112 96 L92 74 M112 104 L138 78 M106 118 L78 116 M118 122 L148 112 M102 138 L82 160 M122 140 L146 166 M100 156 L88 188 M124 156 L136 188',
    colorPalette: {
      trunk: '#6B5348',
      leaves: '#7A6258',
      accent: '#C9C0BA',
    },
  },
  {
    id: 'birch-bare-silver',
    svgPathData: 'M112 118 C100 138,88 150,78 176 C72 192,82 206,96 206 C100 188,104 172,112 156 C120 172,124 188,128 206 C144 206,152 192,146 176 C136 150,124 138,112 118 Z',
    trunkPathData: 'M104 136 C100 174,100 218,104 256 L122 256 C126 218,126 174,120 136 Z',
    detailPathData: 'M112 88 L112 170 M108 104 L90 84 M116 102 L132 84 M106 122 L84 126 M118 124 L140 126 M104 142 L88 164 M120 142 L136 166 M108 176 L98 202 M118 176 L128 202 M106 196 L118 196',
    colorPalette: {
      trunk: '#F1EEE7',
      leaves: '#D9D4CF',
      accent: '#B1A8A2',
    },
  },
  {
    id: 'maple-bare-ember',
    svgPathData: 'M110 110 C94 132,80 144,70 168 C62 188,72 204,90 206 C96 186,100 172,110 154 C120 172,124 186,130 206 C150 204,160 188,152 168 C142 144,128 132,110 110 Z',
    trunkPathData: 'M102 142 C98 176,98 214,102 256 L126 256 C130 214,130 176,122 142 Z',
    detailPathData: 'M112 84 L112 166 M112 96 L92 72 M112 98 L136 70 M102 116 L74 108 M122 118 L150 106 M100 136 L78 160 M124 134 L146 160 M96 154 L84 188 M128 154 L140 188 M108 132 L94 146 M116 132 L128 146',
    colorPalette: {
      trunk: '#734A3A',
      leaves: '#91584A',
      accent: '#D39A84',
    },
  },
  {
    id: 'larch-gold',
    svgPathData: 'M112 40 L152 110 L128 110 L160 156 L132 156 L154 198 L70 198 L92 156 L64 156 L96 110 L72 110 Z',
    trunkPathData: 'M102 198 L122 198 L122 256 L102 256 Z',
    detailPathData: 'M86 112 C98 104,126 104,138 112 M74 146 C90 138,130 138,148 146 M74 176 C92 168,128 168,146 176 M104 88 L92 72 M120 88 L132 72',
    colorPalette: {
      trunk: '#7A4E2A',
      leaves: '#D4A33A',
      accent: '#F0D07A',
    },
  },
];
