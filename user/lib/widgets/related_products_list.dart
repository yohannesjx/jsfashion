import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:google_fonts/google_fonts.dart';
import '../constants.dart';
import '../widgets/product_card.dart';
import '../screens/product_detail_screen.dart'; // Circular import but required for navigation, or extract routing

class RelatedProductsList extends StatefulWidget {
  final String productId;

  const RelatedProductsList({super.key, required this.productId});

  @override
  State<RelatedProductsList> createState() => _RelatedProductsListState();
}

class _RelatedProductsListState extends State<RelatedProductsList> {
  List<Product> _relatedProducts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchRelated();
  }
  
  // To handle prop change if widget is kept alive but id changes
  @override
  void didUpdateWidget(RelatedProductsList oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.productId != widget.productId) {
      _fetchRelated();
    }
  }

  Future<void> _fetchRelated() async {
    // If id is empty waiting for load, don't fetch
    if (widget.productId.isEmpty) return;

    setState(() => _isLoading = true);
    
    try {
      final url = Uri.parse('${ApiConstants.baseUrl}/products/${widget.productId}/related');
      final response = await http.get(url);

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data is List) {
          final list = data.map((json) => Product.fromJson(json)).toList();
          // Shuffle
          list.shuffle();
          if (mounted) setState(() => _relatedProducts = list);
        }
      } else {
        // Silently fail or empty list
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) return const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2)));
    if (_relatedProducts.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16),
          child: Text(
            'You might also like',
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
        SizedBox(
          height: 280, // Height for card + padding
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            scrollDirection: Axis.horizontal,
            itemCount: _relatedProducts.length,
            itemBuilder: (context, index) {
              return Container(
                width: 160, // Fixed width for horizontal items
                margin: const EdgeInsets.only(right: 12),
                child: ProductCard(
                  product: _relatedProducts[index],
                  onTap: () {
                     // Navigate to new detail
                     Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => ProductDetailScreen(
                            slug: _relatedProducts[index].slug.isNotEmpty ? _relatedProducts[index].slug : _relatedProducts[index].id,
                            previewName: _relatedProducts[index].name,
                            previewPrice: _relatedProducts[index].salePrice ?? _relatedProducts[index].basePrice,
                            previewImage: _relatedProducts[index].imageUrl,
                          ),
                        ),
                     );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
