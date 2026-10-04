import { ProductCard } from '../components/ProductCard';
import { PRODUCTS } from './products/data';

export default function Page() {
  return (
    <main>
      <h1>Shop with virtual try-on</h1>
      <p>Server rendered product grid. The try-on dialog and camera only run in the browser.</p>
      <div className="grid">
        {PRODUCTS.map((p) => (
          <ProductCard key={p.id} {...p} />
        ))}
      </div>
    </main>
  );
}
