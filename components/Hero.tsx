import Link from 'next/link';

export function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Discover Premium Products
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Shop from local businesses and get the best deals on quality products
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/shop"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Shop Now
            </Link>
            <Link
              href="/offers"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              View Offers
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
