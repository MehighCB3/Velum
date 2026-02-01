// Test script to verify the nutrition API append behavior
// Run this after starting the dev server with: npm run dev

const BASE_URL = 'http://localhost:3000'
const TEST_DATE = '2026-02-01'

async function testAppendBehavior() {
  console.log('🧪 Testing Nutrition API Append Behavior\n')
  
  // Step 1: Clear any existing data for test date
  console.log('1. Clearing existing test data...')
  await fetch(`${BASE_URL}/api/nutrition?date=${TEST_DATE}`, { method: 'DELETE' })
  
  // Step 2: Add first meal
  console.log('2. Adding first meal (Oatmeal)...')
  const meal1 = {
    date: TEST_DATE,
    name: 'Oatmeal with Berries',
    calories: 350,
    protein: 12,
    carbs: 60,
    fat: 6
  }
  
  const res1 = await fetch(`${BASE_URL}/api/nutrition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meal1)
  })
  const data1 = await res1.json()
  console.log('   Response:', JSON.stringify(data1, null, 2))
  console.log(`   ✓ Entries count: ${data1.entries?.length || 0}`)
  console.log(`   ✓ Total calories: ${data1.totals?.calories || 0}\n`)
  
  // Step 3: Add second meal
  console.log('3. Adding second meal (Chicken Salad)...')
  const meal2 = {
    date: TEST_DATE,
    name: 'Chicken Salad',
    calories: 450,
    protein: 35,
    carbs: 15,
    fat: 20
  }
  
  const res2 = await fetch(`${BASE_URL}/api/nutrition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meal2)
  })
  const data2 = await res2.json()
  console.log('   Response:', JSON.stringify(data2, null, 2))
  console.log(`   ✓ Entries count: ${data2.entries?.length || 0}`)
  console.log(`   ✓ Total calories: ${data2.totals?.calories || 0}\n`)
  
  // Step 4: Add third meal
  console.log('4. Adding third meal (Salmon Dinner)...')
  const meal3 = {
    date: TEST_DATE,
    name: 'Grilled Salmon',
    calories: 550,
    protein: 42,
    carbs: 8,
    fat: 28
  }
  
  const res3 = await fetch(`${BASE_URL}/api/nutrition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meal3)
  })
  const data3 = await res3.json()
  console.log('   Response:', JSON.stringify(data3, null, 2))
  console.log(`   ✓ Entries count: ${data3.entries?.length || 0}`)
  console.log(`   ✓ Total calories: ${data3.totals?.calories || 0}\n`)
  
  // Step 5: Verify via GET
  console.log('5. Verifying via GET request...')
  const getRes = await fetch(`${BASE_URL}/api/nutrition?date=${TEST_DATE}`)
  const getData = await getRes.json()
  console.log('   GET Response:', JSON.stringify(getData, null, 2))
  console.log(`   ✓ Entries count: ${getData.entries?.length || 0}`)
  console.log(`   ✓ Total calories: ${getData.totals?.calories || 0}\n`)
  
  // Final verification
  const success = 
    getData.entries?.length === 3 &&
    getData.totals?.calories === 1350 &&
    getData.totals?.protein === 89
  
  if (success) {
    console.log('✅ ALL TESTS PASSED!')
    console.log('   - All 3 meals are preserved')
    console.log('   - Totals are correctly calculated')
    console.log('   - Append behavior is working correctly')
  } else {
    console.log('❌ TESTS FAILED!')
    console.log(`   Expected 3 entries, got ${getData.entries?.length || 0}`)
    console.log(`   Expected 1350 calories, got ${getData.totals?.calories || 0}`)
    console.log(`   Expected 89g protein, got ${getData.totals?.protein || 0}`)
  }
  
  return success
}

// Run the test
testAppendBehavior()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test error:', err)
    process.exit(1)
  })
