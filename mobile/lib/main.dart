import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'screens/home_screen.dart';
import 'models/cart_model.dart';

import 'package:flutter_native_splash/flutter_native_splash.dart';

void main() {
  print('🚀 [TIMING] main() started');
  final startTime = DateTime.now();
  
  WidgetsBinding widgetsBinding = WidgetsFlutterBinding.ensureInitialized();
  print('🚀 [TIMING] WidgetsBinding initialized: ${DateTime.now().difference(startTime).inMilliseconds}ms');
  
  FlutterNativeSplash.preserve(widgetsBinding: widgetsBinding);
  print('🚀 [TIMING] Splash preserved: ${DateTime.now().difference(startTime).inMilliseconds}ms');
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => CartModel()),
      ],
      child: const MyApp(),
    ),
  );
  print('🚀 [TIMING] runApp called: ${DateTime.now().difference(startTime).inMilliseconds}ms');
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'JS FASHION',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: Colors.white,
        colorScheme: const ColorScheme.light(
          primary: Colors.black,
          secondary: Colors.black,
          surface: Colors.white,
          // background is deprecated, surface is used instead for M3
          error: Colors.red,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black,
          elevation: 0,
        ),
        useMaterial3: true,
        textTheme: GoogleFonts.interTextTheme(),
      ),
      home: const HomeScreen(),
    );
  }
}
