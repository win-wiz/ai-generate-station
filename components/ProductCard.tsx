import React, { useState, useCallback } from 'react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  isFavorite: boolean;
  inStock: boolean;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  onToggleFavorite: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  onToggleFavorite 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleAddToCart = useCallback(async () => {
    setIsLoading(true);
    try {
      await onAddToCart(product.id);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [product.id, onAddToCart]);

  const handleToggleFavorite = useCallback(() => {
    onToggleFavorite(product.id);
  }, [product.id, onToggleFavorite]);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        {!imageError ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            onError={handleImageError}
            className="product-image"
          />
        ) : (
          <div className="image-placeholder">
            <span>No Image</span>
          </div>
        )}
        
        <button 
          className={`favorite-btn ${product.isFavorite ? 'active' : ''}`}
          onClick={handleToggleFavorite}
          aria-label="Toggle favorite"
        >
          ♥
        </button>
      </div>
      
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-description">{product.description}</p>
        
        <div className="product-pricing">
          <span className="current-price">${product.price}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="original-price">${product.originalPrice}</span>
          )}
        </div>
        
        <div className="product-actions">
          <button 
            className="add-to-cart-btn"
            onClick={handleAddToCart}
            disabled={isLoading || !product.inStock}
          >
            {isLoading ? 'Adding...' : product.inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;