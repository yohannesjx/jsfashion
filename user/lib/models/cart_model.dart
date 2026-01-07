import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants.dart';

class CartItem {
  final String productId;
  final String productSlug;
  final String productName;
  final String variantId; // UUID
  final String variantName;
  final double price;
  final double? comparisonPrice; // Added for sale price display
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
    this.comparisonPrice,
    required this.maxStockInt,
    this.maxStock,
    this.imageUrl,
    this.quantity = 1,
  });
  
  double get total => price * quantity;
  
  // Convert to JSON for persistence
  Map<String, dynamic> toJson() => {
    'productId': productId,
    'productSlug': productSlug,
    'productName': productName,
    'variantId': variantId,
    'variantName': variantName,
    'price': price,
    'comparisonPrice': comparisonPrice,
    'maxStockInt': maxStockInt,
    'maxStock': maxStock,
    'imageUrl': imageUrl,
    'quantity': quantity,
  };
  
  // Create from JSON
  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    productId: json['productId'] as String,
    productSlug: json['productSlug'] as String,
    productName: json['productName'] as String,
    variantId: json['variantId'] as String,
    variantName: json['variantName'] as String,
    price: (json['price'] as num).toDouble(),
    comparisonPrice: json['comparisonPrice'] != null ? (json['comparisonPrice'] as num).toDouble() : null,
    maxStockInt: json['maxStockInt'] as int,
    maxStock: json['maxStock'] as String?,
    imageUrl: json['imageUrl'] as String?,
    quantity: json['quantity'] as int,
  );
}

class CartModel extends ChangeNotifier {
  static const String _cartKey = 'cart_items';
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  double get totalAmount => _items.fold(0, (sum, item) => sum + item.total);
  int get itemCount => _items.fold(0, (sum, item) => sum + item.quantity);

  // Load cart from SharedPreferences
  Future<void> loadCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cartString = prefs.getString(_cartKey);
      if (cartString != null && cartString.isNotEmpty) {
        final cartJson = json.decode(cartString) as List;
        _items.clear();
        _items.addAll(cartJson.map((item) => CartItem.fromJson(item as Map<String, dynamic>)));
        notifyListeners();
      }
    } catch (e) {
      // Silent fail - cart will be empty on error
      debugPrint('Error loading cart: $e');
    }
  }
  
  // Save cart to SharedPreferences
  Future<void> _saveCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cartJson = _items.map((item) => item.toJson()).toList();
      await prefs.setString(_cartKey, json.encode(cartJson));
    } catch (e) {
      debugPrint('Error saving cart: $e');
    }
  }

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
    _saveCart(); // Auto-save
  }

  void removeItem(String variantId) {
    _items.removeWhere((item) => item.variantId == variantId);
    notifyListeners();
    _saveCart(); // Auto-save
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
        _saveCart(); // Auto-save
      }
    }
  }
  // Coupon Logic
  Map<String, dynamic>? _appliedCoupon;
  Map<String, dynamic>? get appliedCoupon => _appliedCoupon;

  double get discountAmount {
    if (_appliedCoupon == null) return 0.0;
    
    final value = double.tryParse(_appliedCoupon!['value'].toString()) ?? 0.0;
    final type = _appliedCoupon!['type'];
    
    if (type == 'percentage') {
       return totalAmount * (value / 100);
    } else {
       return value;
    }
  }

  double get discountedTotal => totalAmount - discountAmount;

  Future<bool> applyCoupon(String code) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/coupons/validate?code=$code'),
      );

      if (response.statusCode == 200) {
        final coupon = json.decode(response.body);
        
        // Additional Client-Side Validation (Optional, backend handled most)
        final minOrderValue = double.tryParse(coupon['min_order_value']?.toString() ?? '0') ?? 0.0;
        if (totalAmount < minOrderValue) {
            throw Exception('Minimum order value of $minOrderValue required');
        }

        _appliedCoupon = coupon;
        notifyListeners();
        return true;
      } else {
        _appliedCoupon = null;
        notifyListeners();
        return false;
      }
    } catch (e) {
      _appliedCoupon = null;
      notifyListeners();
      rethrow;
    }
  }

  void removeCoupon() {
    _appliedCoupon = null;
    notifyListeners();
  }

  void clear() {
    _items.clear();
    _appliedCoupon = null; // Clear coupon
    notifyListeners();
    _saveCart(); // Auto-save
  }
}
