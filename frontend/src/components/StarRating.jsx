import React from 'react'
import Rating from '@mui/material/Rating'
import Star from '@mui/icons-material/Star'
import StarBorder from '@mui/icons-material/StarBorder'

/**
 * MUI 별점 컴포넌트
 * - 0.5 단위 선택 (precision=0.5)
 * - 별 테두리 색상: var(--color-acent)
 * - props:
 *   - value: number (0 ~ 5)
 *   - onChange: (nextValue: number) => void
 *   - name?: string
 *   - size?: 'small' | 'medium' | 'large'
 *   - readOnly?: boolean
 */
export default function StarRating({
    value = 0,
    onChange,
    name = 'rating',
    size = 'large',
    readOnly = false,
    sx = {},
}) {
    const handleChange = (_, v) => {
        if (onChange) onChange(v ?? 0)
    }

    return (
        <Rating
            name={name}
            value={value}
            onChange={handleChange}
            precision={0.5}                  // 0.5 단위
            readOnly={readOnly}
            size={size}
            // 채워진 별
            icon={
                <Star
                    sx={{
                        color: 'var(--color-accent)',    // 안쪽도 테두리 색으로 채우기
                        stroke: 'var(--color-accent)',   // 테두리 색
                        strokeWidth: 1.5,
                        ...sx,
                    }}
                    fontSize="inherit"
                />
            }
            // 빈 별
            emptyIcon={
                <StarBorder
                    sx={{
                        color: 'transparent',           // 내부 비움
                        stroke: 'var(--color-accent)',   // 테두리 색
                        strokeWidth: 1.5,
                        ...sx,
                    }}
                    fontSize="inherit"
                />
            }
        />
    )
}
