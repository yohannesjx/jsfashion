import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'screens/home_screen.dart';
import 'models/cart_model.dart';
import 'widgets/animated_splash_screen.dart';

void main() {
  print('🚀 [TIMING] main() started');
  final startTime = DateTime.now();
  
  WidgetsFlutterBinding.ensureInitialized();
  print('🚀 [TIMING] WidgetsBinding initialized: ${DateTime.now().difference(startTime).inMilliseconds}ms');
  
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
      title: 'Js Fashion',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: Colors.white,
        colorScheme: const ColorScheme.light(
          primary: Colors.black,
          secondary: Colors.black,
          surface: Colors.white,
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
      home: const AnimatedSplashScreen(
        duration: Duration(seconds: 2),
        child: HomeScreen(),
      ),
    );
  }
}
