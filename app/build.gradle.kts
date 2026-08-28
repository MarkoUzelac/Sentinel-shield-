plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.devtools.ksp)
}

android {
    namespace = "com.example"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.example"
        minSdk = 24
        targetSdk = 37
        versionCode = 100
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }

        val openCellIdApiKey = providers.environmentVariable("OPEN_CELL_ID_API_KEY").orNull.orEmpty()
        buildConfigField(
            "String",
            "OPEN_CELL_ID_API_KEY",
            "\"${openCellIdApiKey.replace("\\", "\\\\").replace("\"", "\\\"")}\""
        )
    }

    compileOptions {
        isCoreLibraryDesugaringEnabled = true
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }

    val keyStorePath = providers.environmentVariable("KEYSTORE_PATH").orNull
    val keyStorePassword = providers.environmentVariable("KEYSTORE_PASSWORD").orNull
    val keyAliasValue = providers.environmentVariable("KEY_ALIAS").orNull
    val keyPasswordValue = providers.environmentVariable("KEY_PASSWORD").orNull
    val hasReleaseKeystore = listOf(keyStorePath, keyStorePassword, keyAliasValue, keyPasswordValue)
        .all { !it.isNullOrBlank() }

    if (hasReleaseKeystore) {
        signingConfigs {
            create("release") {
                storeFile = file(requireNotNull(keyStorePath))
                storePassword = requireNotNull(keyStorePassword)
                keyAlias = requireNotNull(keyAliasValue)
                keyPassword = requireNotNull(keyPasswordValue)
            }
        }
        buildTypes {
            getByName("release") {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

dependencies {
    coreLibraryDesugaring(libs.desugar.jdk.libs)
    implementation(platform(libs.androidx.compose.bom))
    implementation(platform(libs.firebase.bom))
    implementation(libs.androidx.core)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.core)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.play.services.location)
    implementation(libs.firebase.auth)
    implementation(libs.firebase.firestore)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.coroutines.play.services)
    implementation(libs.wireguard.tunnel)
    implementation(libs.moshi.kotlin)
    implementation(libs.okhttp)
    implementation(libs.retrofit)
    testImplementation(libs.androidx.compose.ui.test.junit4)
    testImplementation(libs.androidx.core)
    testImplementation(libs.androidx.junit)
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.robolectric)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    testImplementation(libs.roborazzi.junit.rule)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.runner)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)
    ksp(libs.androidx.room.compiler)
    ksp(libs.moshi.kotlin.codegen)
}

val productionSigningRequired = providers.gradleProperty("RELEASE_SIGNING_REQUIRED")
    .orElse(providers.environmentVariable("RELEASE_SIGNING_REQUIRED"))
    .orElse("false")
    .map(String::toBoolean)

androidComponents {
    beforeVariants(selector().withBuildType("release")) { variantBuilder ->
        if (productionSigningRequired.get() && variantBuilder.enable) {
            val hasKeystore = listOf("KEYSTORE_PATH", "KEYSTORE_PASSWORD", "KEY_ALIAS", "KEY_PASSWORD")
                .all { providers.environmentVariable(it).orNull?.isNotBlank() == true }
            if (!hasKeystore) {
                throw GradleException("Production signing is required, but release keystore credentials are not configured.")
            }
        }
    }
}
