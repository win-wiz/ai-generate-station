import React, { useState, useEffect, useMemo } from 'react';

const ShoppingCart = ({ items, onUpdateQuantity, onRemoveItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [discount, setDiscount] = useState(0);

  const totalPrice = useMemo(() => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [items]);

  const finalPrice = useMemo(() => {
    return totalPrice - (totalPrice * discount / 100);
  }, [totalPrice, discount]);

  useEffect(() => {
    // Auto-close cart after 5 minutes of inactivity
    const timer = setTimeout(() => {
      setIsOpen(false);
    }, 300000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      onRemoveItem(itemId);
    } else {
      onUpdateQuantity(itemId, newQuantity);
    }
  };

  const CartItem = ({ item }) => (
    <div className="cart-item">
      <img src={item.image} alt={item.name} className="item-image" />
      <div className="item-details">
        <h4>{item.name}</h4>
        <p className="item-price">${item.price}</p>
      </div>
      <div className="quantity-controls">
        <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)}>-</button>
        <span>{item.quantity}</span>
        <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</button>
      </div>
      <button 
        className="remove-btn"
        onClick={() => onRemoveItem(item.id)}
      >
        Remove
      </button>
    </div>
  );

  return (
    <div className={`shopping-cart ${isOpen ? 'open' : 'closed'}`}>
      <button 
        className="cart-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        Cart ({items.length})
      </button>
      
      {isOpen && (
        <div className="cart-content">
          <div className="cart-header">
            <h3>Shopping Cart</h3>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>
          
          <div className="cart-items">
            {items.length === 0 ? (
              <p className="empty-cart">Your cart is empty</p>
            ) : (
              items.map(item => (
                <CartItem key={item.id} item={item} />
              ))
            )}
          </div>
          
          {items.length > 0 && (
            <div className="cart-footer">
              <div className="discount-section">
                <label>Discount (%):</label>
                <input 
                  type="number" 
                  value={discount} 
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  min="0" 
                  max="100"
                />
              </div>
              
              <div className="price-summary">
                <div className="subtotal">Subtotal: ${totalPrice.toFixed(2)}</div>
                {discount > 0 && (
                  <div className="discount">Discount: -${(totalPrice * discount / 100).toFixed(2)}</div>
                )}
                <div className="total">Total: ${finalPrice.toFixed(2)}</div>
              </div>
              
              <button className="checkout-btn">
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShoppingCart;