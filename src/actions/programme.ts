'use server'

import { createClient } from '@/lib/supabase/server'
import { PROGRAMME } from '@/lib/constants/programme-data'

export async function seedProgramme() {
  const supabase = await createClient()

  for (const block of PROGRAMME) {
    if (block.days.length === 0) continue // Skip incomplete blocks

    const { data: blockData, error: blockError } = await supabase
      .from('blocks')
      .insert({
        name: block.name,
        description: block.description,
        week_start: block.week_start,
        week_end: block.week_end,
        focus: block.focus,
        rep_range_compounds: block.rep_range_compounds,
        rep_range_accessories: block.rep_range_accessories,
        sort_order: block.sort_order,
      })
      .select('id')
      .single()

    if (blockError) throw new Error(`Block insert failed: ${blockError.message}`)

    for (const day of block.days) {
      const { data: dayData, error: dayError } = await supabase
        .from('programme_days')
        .insert({
          block_id: blockData.id,
          day_of_week: day.day_of_week,
          name: day.name,
          emphasis: day.emphasis,
          sort_order: day.sort_order,
        })
        .select('id')
        .single()

      if (dayError) throw new Error(`Day insert failed: ${dayError.message}`)

      const exercises = day.exercises.map((ex) => ({
        programme_day_id: dayData.id,
        ...ex,
      }))

      const { error: exError } = await supabase
        .from('programme_exercises')
        .insert(exercises)

      if (exError) throw new Error(`Exercise insert failed: ${exError.message}`)
    }
  }

  return { success: true }
}
