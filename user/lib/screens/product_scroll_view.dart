import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../constants.dart';
import '../widgets/product_card.dart';
import '../utils/logger.dart';
import 'product_detail_screen.dart';

class ProductScrollView extends StatefulWidget {
  final String initialSlug;
  final String? initialName;
  final String? initialImage;
  final String? initialPrice;

  const ProductScrollView({
    super.key,
    required this.initialSlug,
    this.initialName,
    this.initialImage,
    this.initialPrice,
  });

  @override
  State<ProductScrollView> createState() => _ProductScrollViewState();
}

class _ProductScrollViewState extends State<ProductScrollView> {
  final PageController _pageController = PageController();
  List<Product> _products = [];
  bool _isLoading = true;
  bool _isFetchingMore = false;

  @override
  void initState() {
    super.initState();
    _fetchRandomProducts();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _fetchRandomProducts() async {
    if (_isFetchingMore) return;
    
    setState(() {
      _isFetchingMore = true;
    });

    try {
      // Fetch LARGE batch of products to simulate "all random"
      // 300 is a good balance between "all" and performance. Can increase to 1000 if needed.
      final url = Uri.parse('${ApiConstants.baseUrl}/products?limit=500'); 
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final dynamic data = json.decode(response.body);
        List<dynamic> productList;
        
        if (data is List) {
          productList = data;
        } else {
          productList = data['products'] ?? [];
        }

        // Shuffle for randomness
        productList.shuffle();
        
        final newProducts = productList.map((json) => Product.fromJson(json)).toList();
        
        if (mounted) {
          setState(() {
            if (_products.isEmpty) {
              // First load - try to find the initial product and put it first
              final initialIndex = newProducts.indexWhere((p) => p.slug == widget.initialSlug || p.id == widget.initialSlug);
              
              Product? initialProduct;
              if (initialIndex != -1) {
                initialProduct = newProducts.removeAt(initialIndex);
              } else {
                 // Initial product not in the random 500 batch, create placeholder or fetch specifically? 
                 // Placeholder is fine as ProductDetailScreen usually re-fetches details.
                 initialProduct = Product(
                    id: widget.initialSlug,
                    name: widget.initialName ?? 'Product',
                    basePrice: widget.initialPrice ?? '0',
                    slug: widget.initialSlug,
                    imageUrl: widget.initialImage,
                  );
              }
              
              _products = [initialProduct, ...newProducts];
            } else {
              // We likely won't hit this with a large initial batch, 
              // but if we do, avoiding duplicates is hard without offset.
              // For now, we assume 500/1000 is enough for one session.
            }
            _isLoading = false;
            _isFetchingMore = false;
          });
        }
      }
    } catch (e) {
      AppLogger.error('Error fetching random products', e);
      if (mounted) {
        setState(() {
          _isLoading = false;
          _isFetchingMore = false;
        });
      }
    }
  }

  void _onPageChanged(int page) {
    // No more "load more" logic since we fetch a huge batch upfront.
    // Re-fetching random pages creates duplicates and destroys the feed UX.
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Colors.white,
        body: Center(
          child: CircularProgressIndicator(color: Colors.black),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: PageView.builder(
        controller: _pageController,
        scrollDirection: Axis.vertical,
        itemCount: _products.length,
        onPageChanged: _onPageChanged,
        itemBuilder: (context, index) {
          final product = _products[index];
          return ProductDetailScreen(
            slug: product.slug.isNotEmpty ? product.slug : product.id,
            previewName: product.name,
            previewImage: product.imageUrl,
            previewPrice: product.salePrice ?? product.basePrice,
          );
        },
      ),
    );
  }
}
