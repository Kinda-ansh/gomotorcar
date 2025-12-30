import express from 'express';
import auth from '../../../middlewares/auth.middleware';
import { OnboardingScreenController } from './onboardingScreen.controller';
import { HomeScreenCarouselController } from './homeScreenCarousel.controller';

const router = express.Router();

// Onboarding Screen Routes
router.get('/onboarding-screens', OnboardingScreenController.getOnboardingScreens);
router.post('/onboarding-screens', auth, OnboardingScreenController.createOnboardingScreen);
router.get('/onboarding-screens/:id', OnboardingScreenController.getOnboardingScreen);
router.patch('/onboarding-screens/:id', auth, OnboardingScreenController.updateOnboardingScreen);
router.delete('/onboarding-screens/:id', auth, OnboardingScreenController.deleteOnboardingScreen);

// Home Screen Carousel Routes
router.get('/home-screen-carousels', HomeScreenCarouselController.getHomeScreenCarousels);
router.post('/home-screen-carousels', auth, HomeScreenCarouselController.createHomeScreenCarousel);
router.get('/home-screen-carousels/:id', HomeScreenCarouselController.getHomeScreenCarousel);
router.patch('/home-screen-carousels/:id', auth, HomeScreenCarouselController.updateHomeScreenCarousel);
router.delete('/home-screen-carousels/:id', auth, HomeScreenCarouselController.deleteHomeScreenCarousel);

export default router;
