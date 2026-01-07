import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../models/cart_model.dart';

class HomeAppBar extends StatelessWidget {
  final VoidCallback onSearchTap;
  final VoidCallback onCartTap;
  final VoidCallback onMenuTap;
  final bool isSearchVisible;
  final ScrollController scrollController;

  const HomeAppBar({
    Key? key,
    required this.onSearchTap,
    required this.onCartTap,
    required this.onMenuTap,
    required this.isSearchVisible,
    required this.scrollController,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: scrollController,
      builder: (context, child) {
        final isScrolled = scrollController.hasClients && scrollController.offset > 0;
        return Container(
          color: isScrolled ? Colors.white : Colors.transparent,
          padding: EdgeInsets.only(
            top: MediaQuery.of(context).padding.top,
            left: 16,
            right: 16,
            bottom: 16,
          ),
          child: Row(
            children: [
              IconButton(
                icon: Icon(
                  Icons.menu,
                  color: isScrolled || isSearchVisible ? Colors.black : Colors.white,
                ),
                onPressed: onMenuTap,
              ),
              Expanded(
                child: Center(
                  child: Text(
                    'JS FASHION',
                    style: GoogleFonts.inter(
                      fontSize: 24,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1.0,
                      color: isScrolled || isSearchVisible ? Colors.black : Colors.white,
                    ),
                  ),
                ),
              ),
              Stack(
                children: [
                  IconButton(
                    icon: Icon(
                      Icons.shopping_bag_outlined,
                      color: isScrolled || isSearchVisible ? Colors.black : Colors.white,
                    ),
                    onPressed: onCartTap,
                  ),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Selector<CartModel, int>(
                      selector: (_, cart) => cart.itemCount,
                      builder: (_, itemCount, __) {
                        if (itemCount == 0) return const SizedBox.shrink();
                        return Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          constraints: const BoxConstraints(
                            minWidth: 16,
                            minHeight: 16,
                          ),
                          child: Text(
                            itemCount.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
