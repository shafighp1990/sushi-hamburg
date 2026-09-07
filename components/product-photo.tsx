import type {CSSProperties} from 'react';
import type {Product,Language} from '@/lib/catalog';
// oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- A labeled CSS background crops the supplied menu poster to its exact product region.
export function ProductPhoto({product,lang='de'}:{product:Product;lang?:Language}){const dims=product.poster==='signature'?[1280,799]:product.poster==='sets'?[1280,853]:product.poster==='new'?[1280,633]:[1264,842];const[x,y,w,h]=product.crop;return <div role="img" aria-label={product.name[lang]} className="product-photo" style={{backgroundImage:`url(/menus/${product.poster}.jpg)`,backgroundSize:`${dims[0]/w*100}% ${dims[1]/h*100}%`,backgroundPosition:`${x/(dims[0]-w)*100}% ${y/(dims[1]-h)*100}%`,aspectRatio:`${w}/${h}`} as CSSProperties}/>}
