import Image from 'next/image';

interface Offer {
  id: number;
  title: string;
  description: string;
  image_url: string;
  discount_percentage: number;
}

export function OfferBanner({ offer }: { offer: Offer }) {
  return (
    <div className="relative rounded-lg overflow-hidden shadow-lg group cursor-pointer">
      <div className="relative h-64">
        <Image
          src={offer.image_url || '/placeholder.jpg'}
          alt={offer.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        
        {/* Discount Badge */}
        <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold">
          {offer.discount_percentage}% OFF
        </div>
        
        {/* Offer Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <h3 className="text-2xl font-bold mb-2">{offer.title}</h3>
          <p className="text-sm text-gray-200">{offer.description}</p>
        </div>
      </div>
    </div>
  );
}
