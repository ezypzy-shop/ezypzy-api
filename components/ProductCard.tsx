import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
}

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={`/product/${product.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow overflow-hidden group">
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={product.image_url || '/placeholder.jpg'}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.name}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-bold text-lg">
              ₹{product.price.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500 capitalize">{product.category}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
