import 'package:flutter/foundation.dart';

class CartItem {
  final String productId;
  final String productSlug;
  final String productName;
  final String variantId; // UUID
  final String variantName;
  final double price;
  final String? maxStock; // Using String to match other logic or int if cleaner, sticking to mismatch handling
  final int maxStockInt;
  final String? imageUrl;
  int quantity;

  CartItem({
    required this.productId,
    required this.productSlug,
    required this.productName,
    required this.variantId,
    required this.variantName,
    required this.price,
    required this.maxStockInt,
    this.maxStock,
    this.imageUrl,
    this.quantity = 1,
  });
  
  double get total => price * quantity;
}

class CartModel extends ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  double get totalAmount => _items.fold(0, (sum, item) => sum + item.total);
  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);

  void addItem(CartItem newItem) {
    // Check if item exists (same variant)
    final index = _items.indexWhere((item) => item.variantId == newItem.variantId);
    
    if (index >= 0) {
      // Update quantity if within stock limits
      final currentItem = _items[index];
      if (currentItem.quantity + newItem.quantity <= currentItem.maxStockInt) {
        _items[index].quantity += newItem.quantity;
      } else {
        // Here we might want to notify UI about stock limit, but for now just cap it or ignore
        _items[index].quantity = currentItem.maxStockInt;
      }
    } else {
      _items.add(newItem);
    }
    notifyListeners();
  }

  void removeItem(String variantId) {
    _items.removeWhere((item) => item.variantId == variantId);
    notifyListeners();
  }

  void updateQuantity(String variantId, int newQuantity) {
    final index = _items.indexWhere((item) => item.variantId == variantId);
    if (index >= 0) {
      if (newQuantity <= 0) {
        removeItem(variantId);
      } else {
        // Cap at max stock
        if (newQuantity <= _items[index].maxStockInt) {
            _items[index].quantity = newQuantity;
        } else {
            _items[index].quantity = _items[index].maxStockInt;
        }
        notifyListeners();
      }
    }
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}
